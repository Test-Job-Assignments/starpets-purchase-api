import { Injectable } from '@nestjs/common';

import { Mapper } from '@/common/mappers/mapper.interface';

import { IdempotencyKey } from './idempotency-key';
import { IdempotencyKeyEntity } from './idempotency-key.entity';

@Injectable()
export class IdempotencyKeyMapper implements Mapper<
  IdempotencyKeyEntity,
  IdempotencyKey
> {
  toDomain(entity: IdempotencyKeyEntity): IdempotencyKey {
    return {
      key: entity.key,
      requestHash: entity.requestHash,
      status: entity.status,
      responseBody: entity.responseBody,
      responseStatus: entity.responseStatus,
    };
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
