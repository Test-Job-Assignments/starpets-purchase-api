import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { IdGenerator } from '@/common/id-generator';
import { error, ErrorResult, ok, OkResult } from '@/common/result';
import {
  isBodyWithErrorMessage,
  isBodyWithPurchaseId,
} from '@/idempotency/idempotency-key';
import { CorruptedIdempotencyRecordException } from '@/idempotency/idempotency-keys.exceptions';
import { IdempotencyKeysRepository } from '@/idempotency/idempotency-keys.repository';
import { IdempotencyStatuses } from '@/idempotency/idempotency-statuses.enum';
import { OutboxEvent } from '@/outbox/outbox-event';
import { OutboxEventTypes } from '@/outbox/outbox-event-types.enum';
import { OutboxEventsRepository } from '@/outbox/outbox-events.repository';
import { Product } from '@/products/product';
import { ProductStatuses } from '@/products/product-statuses.enum';
import { ProductsRepository } from '@/products/products.repository';
import { User } from '@/users/user';
import { UsersRepository } from '@/users/users.repository';

import { Purchase } from './purchase';
import {
  BuyerNotFoundException,
  IdempotencyConflictException,
  InsufficientBalanceException,
  ProductNotFoundException,
  ProductUnavailableException,
  SameBuyerSellerException,
  SellerNotFoundException,
} from './purchase.exceptions';
import { PurchasesRepository } from './purchases.repository';

export interface CreatePurchaseInput {
  buyerId: string;
  productId: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface CreatePurchaseResult {
  httpStatus: HttpStatus;
  purchaseId: string;
}

type TransactionResult =
  | OkResult<{
      httpStatus: HttpStatus;
      purchaseId: string;
    }>
  | ErrorResult<{
      exception: HttpException;
    }>;

type ProductLoadResult =
  | OkResult<{ product: Product }>
  | ErrorResult<{ exception: HttpException }>;

type UsersLoadResult =
  | OkResult<{ buyer: User }>
  | ErrorResult<{ exception: HttpException }>;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyKeysRepository: IdempotencyKeysRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly purchasesRepository: PurchasesRepository,
    private readonly idGenerator: IdGenerator,
    private readonly outboxEventsRepository: OutboxEventsRepository,
  ) {}

  async createPurchase(
    input: CreatePurchaseInput,
  ): Promise<CreatePurchaseResult> {
    const result = await this.dataSource.transaction<TransactionResult>(
      async (manager) => {
        const reservationResult =
          await this.handleCompletedIdempotencyReservation(manager, input);
        if (reservationResult) return reservationResult;

        const productResult = await this.loadAndValidateProduct(
          manager,
          input.productId,
        );
        if (!productResult.ok) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            productResult.exception,
          );
        }
        const { product } = productResult;

        const usersResult = await this.loadAndValidateUsers(
          manager,
          input.buyerId,
          product.sellerId,
        );
        if (!usersResult.ok) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            usersResult.exception,
          );
        }
        const { buyer } = usersResult;

        const validationException = this.validatePurchaseRules(
          input.buyerId,
          product,
          buyer,
        );
        if (validationException) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            validationException,
          );
        }

        await this.transferBalance(
          manager,
          input.buyerId,
          product.sellerId,
          product.price,
        );
        await this.productsRepository.markSold(manager, input.productId);
        const purchase = await this.createPurchaseRecord(
          manager,
          input,
          product,
        );
        await this.createPurchaseOutboxEvent(manager, purchase, product, input);

        return this.completeSuccessfulPurchase(
          manager,
          input.idempotencyKey,
          purchase.id,
        );
      },
    );

    return this.unwrapTransactionResult(result);
  }

  private async handleCompletedIdempotencyReservation(
    manager: EntityManager,
    input: CreatePurchaseInput,
  ): Promise<TransactionResult | undefined> {
    const reservation = await this.idempotencyKeysRepository.reserve(
      manager,
      input.idempotencyKey,
      input.requestHash,
    );

    if (reservation.status !== IdempotencyStatuses.COMPLETED) {
      return undefined;
    }

    if (reservation.requestHash !== input.requestHash) {
      return error({
        exception: new IdempotencyConflictException(),
      });
    }

    if (isBodyWithPurchaseId(reservation.responseBody)) {
      return ok({
        httpStatus: reservation.responseStatus,
        purchaseId: reservation.responseBody.purchaseId,
      });
    }

    if (isBodyWithErrorMessage(reservation.responseBody)) {
      return error({
        exception: new HttpException(
          reservation.responseBody.message,
          reservation.responseStatus,
        ),
      });
    }

    throw new CorruptedIdempotencyRecordException();
  }

  private async loadAndValidateProduct(
    manager: EntityManager,
    productId: string,
  ): Promise<ProductLoadResult> {
    const product = await this.productsRepository.lockById(manager, productId);
    if (!product) {
      return error({ exception: new ProductNotFoundException() });
    }
    return ok({ product });
  }

  private async loadAndValidateUsers(
    manager: EntityManager,
    buyerId: string,
    sellerId: string,
  ): Promise<UsersLoadResult> {
    const users = await this.usersRepository.lockByIds(manager, [
      buyerId,
      sellerId,
    ]);
    const buyer = users.find((user) => user.id === buyerId);
    const seller = users.find((user) => user.id === sellerId);

    if (!buyer) {
      return error({ exception: new BuyerNotFoundException() });
    }
    if (!seller) {
      return error({ exception: new SellerNotFoundException() });
    }
    return ok({ buyer });
  }

  private validatePurchaseRules(
    buyerId: string,
    product: Product,
    buyer: User,
  ): HttpException | undefined {
    if (buyerId === product.sellerId) {
      return new SameBuyerSellerException();
    }
    if (product.status !== ProductStatuses.AVAILABLE) {
      return new ProductUnavailableException();
    }
    if (buyer.balance < product.price) {
      return new InsufficientBalanceException();
    }
    return undefined;
  }

  private async transferBalance(
    manager: EntityManager,
    buyerId: string,
    sellerId: string,
    price: bigint,
  ): Promise<void> {
    await this.usersRepository.debit(manager, buyerId, price.toString());
    await this.usersRepository.credit(manager, sellerId, price.toString());
  }

  private async createPurchaseRecord(
    manager: EntityManager,
    input: CreatePurchaseInput,
    product: Product,
  ): Promise<Purchase> {
    const purchase: Purchase = {
      id: this.idGenerator.generate(),
      productId: input.productId,
      buyerId: input.buyerId,
      pricePaid: product.price,
    };
    await this.purchasesRepository.insert(manager, purchase);
    return purchase;
  }

  private async createPurchaseOutboxEvent(
    manager: EntityManager,
    purchase: Purchase,
    product: Product,
    input: CreatePurchaseInput,
  ): Promise<void> {
    const outboxEvent: OutboxEvent = {
      id: this.idGenerator.generate(),
      eventType: OutboxEventTypes.PURCHASE_CREATED,
      payload: {
        purchaseId: purchase.id,
        productId: input.productId,
        buyerId: input.buyerId,
        sellerId: product.sellerId,
        price: product.price.toString(),
      },
    };
    await this.outboxEventsRepository.insert(manager, outboxEvent);
  }

  private async completeSuccessfulPurchase(
    manager: EntityManager,
    key: string,
    purchaseId: string,
  ): Promise<TransactionResult> {
    await this.idempotencyKeysRepository.complete(
      manager,
      key,
      HttpStatus.CREATED,
      { purchaseId },
    );
    return ok({ httpStatus: HttpStatus.CREATED, purchaseId });
  }

  private async completeWithError(
    manager: EntityManager,
    key: string,
    exception: HttpException,
  ): Promise<TransactionResult> {
    await this.idempotencyKeysRepository.complete(
      manager,
      key,
      exception.getStatus(),
      { message: exception.message },
    );
    return error({ exception });
  }

  private unwrapTransactionResult(
    result: TransactionResult,
  ): CreatePurchaseResult {
    if (result.ok) {
      return { httpStatus: result.httpStatus, purchaseId: result.purchaseId };
    }
    throw result.exception;
  }
}
