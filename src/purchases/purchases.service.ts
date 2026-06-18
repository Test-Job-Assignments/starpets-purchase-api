import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import {
  BodyWithErrorMessage,
  BodyWithPurchaseId,
} from '@/idempotency/idempotency-key';
import { IdempotencyKeysRepository } from '@/idempotency/idempotency-keys.repository';
import { IdempotencyStatuses } from '@/idempotency/idempotency-statuses.enum';
import { OutboxEvent } from '@/outbox/outbox-event';
import { OutboxEventTypes } from '@/outbox/outbox-event-types.enum';
import { OutboxEventsRepository } from '@/outbox/outbox-events.repository';
import { ProductStatuses } from '@/products/product-statuses.enum';
import { ProductsRepository } from '@/products/products.repository';
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

enum TransactionOutcomeKind {
  SUCCESS = 'success',
  ERROR = 'error',
}

type SuccessTransactionOutcome = {
  kind: TransactionOutcomeKind.SUCCESS;
  status: HttpStatus;
  purchaseId: string;
};

type ErrorTransactionOutcome = {
  kind: TransactionOutcomeKind.ERROR;
  exception: HttpException;
};

type TransactionOutcome = SuccessTransactionOutcome | ErrorTransactionOutcome;

function success(
  data: Omit<SuccessTransactionOutcome, 'kind'>,
): SuccessTransactionOutcome {
  return { ...data, kind: TransactionOutcomeKind.SUCCESS };
}

function error(
  data: Omit<ErrorTransactionOutcome, 'kind'>,
): ErrorTransactionOutcome {
  return { ...data, kind: TransactionOutcomeKind.ERROR };
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

  async createPurchase(
    input: CreatePurchaseInput,
  ): Promise<CreatePurchaseResult> {
    const outcome = await this.dataSource.transaction<TransactionOutcome>(
      async (manager) => {
        const reservation = await this.idempotencyKeysRepository.reserve(
          manager,
          input.idempotencyKey,
          input.requestHash,
        );

        if (reservation.status === IdempotencyStatuses.COMPLETED) {
          if (reservation.requestHash === input.requestHash) {
            if (reservation.responseStatus < HttpStatus.BAD_REQUEST) {
              const body = reservation.responseBody as BodyWithPurchaseId;
              return success({
                status: reservation.responseStatus,
                purchaseId: body.purchaseId,
              });
            }
            const body = reservation.responseBody as BodyWithErrorMessage;
            return error({
              exception: new HttpException(
                body.message,
                reservation.responseStatus,
              ),
            });
          }
          return error({
            exception: new IdempotencyConflictException(),
          });
        }

        const product = await this.productsRepository.lockById(
          manager,
          input.productId,
        );

        if (!product) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            new ProductNotFoundException(),
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
            new BuyerNotFoundException(),
          );
        }

        if (!seller) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            new SellerNotFoundException(),
          );
        }

        if (input.buyerId === product.sellerId) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            new SameBuyerSellerException(),
          );
        }

        if (product.status !== ProductStatuses.AVAILABLE) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            new ProductUnavailableException(),
          );
        }

        if (BigInt(buyer.balance) < BigInt(product.price)) {
          return this.completeWithError(
            manager,
            input.idempotencyKey,
            new InsufficientBalanceException(),
          );
        }

        await this.usersRepository.debit(manager, input.buyerId, product.price);
        await this.usersRepository.credit(
          manager,
          product.sellerId,
          product.price,
        );
        await this.productsRepository.markSold(manager, input.productId);

        const purchase: Purchase = {
          id: uuidv7(),
          productId: input.productId,
          buyerId: input.buyerId,
          pricePaid: product.price,
        };
        await this.purchasesRepository.insert(manager, purchase);

        const outboxEvent: OutboxEvent = {
          id: uuidv7(),
          eventType: OutboxEventTypes.PURCHASE_CREATED,
          payload: {
            purchaseId: purchase.id,
            productId: input.productId,
            buyerId: input.buyerId,
            sellerId: product.sellerId,
            price: product.price,
          },
        };
        await this.outboxEventsRepository.insert(manager, outboxEvent);

        const responseBody = { purchaseId: purchase.id };
        await this.idempotencyKeysRepository.complete(
          manager,
          input.idempotencyKey,
          HttpStatus.CREATED,
          responseBody,
        );

        return success({
          status: HttpStatus.CREATED,
          purchaseId: purchase.id,
        });
      },
    );

    switch (outcome.kind) {
      case TransactionOutcomeKind.SUCCESS:
        return {
          httpStatus: outcome.status,
          purchaseId: outcome.purchaseId,
        };
      case TransactionOutcomeKind.ERROR:
        throw outcome.exception;
    }
  }

  private async completeWithError(
    manager: EntityManager,
    key: string,
    exception: HttpException,
  ): Promise<TransactionOutcome> {
    await this.idempotencyKeysRepository.complete(
      manager,
      key,
      exception.getStatus(),
      { message: exception.message },
    );
    return error({ exception });
  }
}
