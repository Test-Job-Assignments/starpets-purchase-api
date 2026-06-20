import { Injectable } from '@nestjs/common';

import { JsonB } from '@/common/jsonb';
import { Mapper } from '@/common/mapper.interface';

import {
  BodyWithErrorMessage,
  BodyWithPurchaseId,
  IdempotencyKey,
} from './idempotency-key';
import { IdempotencyKeyEntity } from './idempotency-key.entity';
import {
  CorruptedIdempotencyRecordException,
  InvalidIdempotencyResponseBodyException,
} from './idempotency-keys.exceptions';
import { IdempotencyStatuses } from './idempotency-statuses.enum';

@Injectable()
export class IdempotencyKeyMapper implements Mapper<
  IdempotencyKeyEntity,
  IdempotencyKey
> {
  toDomain(entity: IdempotencyKeyEntity): IdempotencyKey {
    switch (entity.status) {
      case IdempotencyStatuses.PROCESSING:
        return {
          key: entity.key,
          requestHash: entity.requestHash,
          status: entity.status,
          responseBody: null,
          responseStatus: null,
        };
      case IdempotencyStatuses.COMPLETED:
        if (!entity.responseBody || entity.responseStatus === null)
          throw new CorruptedIdempotencyRecordException();

        return {
          key: entity.key,
          requestHash: entity.requestHash,
          status: entity.status,
          responseBody: toDomainResponseBody(entity.responseBody),
          responseStatus: entity.responseStatus,
        };
      default:
        throw new CorruptedIdempotencyRecordException();
    }
  }

  toEntity(domain: IdempotencyKey): IdempotencyKeyEntity {
    return {
      key: domain.key,
      requestHash: domain.requestHash,
      status: domain.status,
      responseBody: domain.responseBody,
      responseStatus: domain.responseStatus,
    } as IdempotencyKeyEntity;
  }
}

function toDomainResponseBody(
  body: JsonB,
): BodyWithPurchaseId | BodyWithErrorMessage {
  if (isBodyWithPurchaseId(body)) return body;
  if (isBodyWithErrorMessage(body)) return body;
  throw new InvalidIdempotencyResponseBodyException();
}

function isBodyWithPurchaseId(value: JsonB): value is BodyWithPurchaseId {
  return typeof value.purchaseId === 'string';
}

function isBodyWithErrorMessage(value: JsonB): value is BodyWithErrorMessage {
  return typeof value.message === 'string';
}
