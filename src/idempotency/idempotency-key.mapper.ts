import { Injectable } from '@nestjs/common';

import { JsonB } from '@/common/jsonb';

import {
  BodyWithErrorMessage,
  BodyWithPurchaseId,
  IdempotencyKey,
  isBodyWithErrorMessage,
  isBodyWithPurchaseId,
} from './idempotency-key';
import { IdempotencyKeyEntity } from './idempotency-key.entity';
import {
  CorruptedIdempotencyRecordException,
  InvalidIdempotencyResponseBodyException,
} from './idempotency-keys.exceptions';
import { IdempotencyStatuses } from './idempotency-statuses.enum';

@Injectable()
export class IdempotencyKeyMapper {
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
}

function toDomainResponseBody(
  body: JsonB,
): BodyWithPurchaseId | BodyWithErrorMessage {
  if (isBodyWithPurchaseId(body)) return body;
  if (isBodyWithErrorMessage(body)) return body;
  throw new InvalidIdempotencyResponseBodyException();
}
