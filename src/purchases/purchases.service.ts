import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { IdempotencyKeysRepository } from '@/idempotency/idempotency-keys.repository';
import { IdempotencyStatuses } from '@/idempotency/idempotency-statuses.enum';
import { OutboxEvent } from '@/outbox/outbox-event';
import { OutboxEventTypes } from '@/outbox/outbox-event-types.enum';
import { OutboxEventsRepository } from '@/outbox/outbox-events.repository';
import { ProductStatuses } from '@/products/product-statuses.enum';
import { ProductsRepository } from '@/products/products.repository';
import { UsersRepository } from '@/users/users.repository';

import { Purchase } from './purchase';
import { PurchasesRepository } from './purchases.repository';

export interface CreatePurchaseInput {
  buyerId: string;
  productId: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface PurchaseResult {
  httpStatus: number;
  body: Record<string, unknown>;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyKeysRepository: IdempotencyKeysRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly purchasesRepository: PurchasesRepository,
    private readonly outboxEventsRepository: OutboxEventsRepository,
  ) {}

  async createPurchase(input: CreatePurchaseInput): Promise<PurchaseResult> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await this.idempotencyKeysRepository.reserve(
        manager,
        input.idempotencyKey,
        input.requestHash,
      );

      if (reservation.status === IdempotencyStatuses.COMPLETED) {
        if (reservation.requestHash === input.requestHash) {
          return {
            httpStatus: HttpStatus.OK,
            body: reservation.responseBody ?? {},
          };
        }
        return {
          httpStatus: HttpStatus.CONFLICT,
          body: {
            message: 'Idempotency key was used with a different request',
          },
        };
      }

      const product = await this.productsRepository.lockById(
        manager,
        input.productId,
      );

      if (!product) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.NOT_FOUND,
          'Product not found',
        );
      }

      const users = await this.usersRepository.lockByIds(manager, [
        input.buyerId,
        product.sellerId,
      ]);
      const buyer = users.find((user) => user.id === input.buyerId);
      const seller = users.find((user) => user.id === product.sellerId);

      if (!buyer) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.NOT_FOUND,
          'Buyer not found',
        );
      }

      if (!seller) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.NOT_FOUND,
          'Seller not found',
        );
      }

      if (input.buyerId === product.sellerId) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.BAD_REQUEST,
          'Buyer and seller must be different',
        );
      }

      if (product.status !== ProductStatuses.AVAILABLE) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.CONFLICT,
          'Product is no longer available',
        );
      }

      if (BigInt(buyer.balance) < BigInt(product.price)) {
        return this.completeWithError(
          manager,
          input.idempotencyKey,
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Insufficient balance',
        );
      }

      await this.usersRepository.debit(manager, input.buyerId, product.price);
      await this.usersRepository.credit(
        manager,
        product.sellerId,
        product.price,
      );
      await this.productsRepository.markSold(manager, input.productId);

      const purchase = new Purchase(
        uuidv7(),
        input.productId,
        input.buyerId,
        product.price,
      );
      await this.purchasesRepository.insert(manager, purchase);

      const responseBody = {
        purchaseId: purchase.id,
        productId: input.productId,
        buyerId: input.buyerId,
        sellerId: product.sellerId,
        price: product.price,
      };

      const outboxEvent = new OutboxEvent(
        uuidv7(),
        OutboxEventTypes.PURCHASE_CREATED,
        responseBody,
      );
      await this.outboxEventsRepository.insert(manager, outboxEvent);

      await this.idempotencyKeysRepository.complete(
        manager,
        input.idempotencyKey,
        HttpStatus.CREATED,
        responseBody,
      );

      return { httpStatus: HttpStatus.CREATED, body: responseBody };
    });
  }

  private async completeWithError(
    manager: EntityManager,
    key: string,
    httpStatus: number,
    message: string,
  ): Promise<PurchaseResult> {
    const body = { message };
    await this.idempotencyKeysRepository.complete(
      manager,
      key,
      httpStatus,
      body,
    );
    return { httpStatus, body };
  }
}
