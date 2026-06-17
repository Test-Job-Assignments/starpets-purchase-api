import IdempotencyKeyEntity from '../entities/idempotency-key.entity';
import { IdempotencyKey } from '../domain/idempotency-key';

export class IdempotencyKeyMapper {
  static toDomain(entity: IdempotencyKeyEntity): IdempotencyKey {
    return new IdempotencyKey(
      entity.key,
      entity.requestHash,
      entity.status,
      entity.responseBody,
      entity.responseStatus,
    );
  }
}
