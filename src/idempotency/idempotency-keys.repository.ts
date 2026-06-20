import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { JsonB } from '@/common/jsonb';

import { IdempotencyKey } from './idempotency-key';
import { IdempotencyKeyEntity } from './idempotency-key.entity';
import { IdempotencyKeyMapper } from './idempotency-key.mapper';
import { IdempotencyStatuses } from './idempotency-statuses.enum';

@Injectable()
export class IdempotencyKeysRepository {
  constructor(private readonly mapper: IdempotencyKeyMapper) {}

  async reserve(
    manager: EntityManager,
    key: string,
    requestHash: string,
  ): Promise<IdempotencyKey> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKeyEntity)
      .values({ key, requestHash, status: IdempotencyStatuses.PROCESSING })
      // No-op DO UPDATE (key = EXCLUDED.key): without it, ON CONFLICT DO NOTHING
      // would return no row, but we need RETURNING to see the conflicting row.
      .orUpdate(['key'], ['key'])
      .returning('*')
      .execute();
    return this.mapper.toDomain(
      result.generatedMaps[0] as IdempotencyKeyEntity,
    );
  }

  async complete(
    manager: EntityManager,
    key: string,
    responseStatus: number,
    responseBody: JsonB,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(IdempotencyKeyEntity)
      .set({
        status: IdempotencyStatuses.COMPLETED,
        responseBody,
        responseStatus,
        updatedAt: () => 'NOW()',
      })
      .where('key = :key', { key })
      .execute();
  }
}
