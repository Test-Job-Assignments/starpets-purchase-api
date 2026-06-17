import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import IdempotencyKeyEntity from '../entities/idempotency-key.entity';
import { IdempotencyStatuses } from '../enums/idempotency-statuses.enum';
import { IdempotencyKey } from '../domain/idempotency-key';
import { IdempotencyKeyMapper } from '../mappers/idempotency-key.mapper';

@Injectable()
export class IdempotencyKeysRepository {
  async reserve(
    manager: EntityManager,
    key: string,
    requestHash: string,
  ): Promise<IdempotencyKey> {
    const rows = await manager.query<IdempotencyKeyEntity[]>(
      `INSERT INTO idempotency_keys (key, request_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
         SET updated_at = idempotency_keys.updated_at
       RETURNING
         key,
         request_hash AS "requestHash",
         status,
         response_body AS "responseBody",
         response_status AS "responseStatus"`,
      [key, requestHash, IdempotencyStatuses.PROCESSING],
    );
    return IdempotencyKeyMapper.toDomain(rows[0]);
  }

  async complete(
    manager: EntityManager,
    key: string,
    responseStatus: number,
    responseBody: Record<string, unknown>,
  ): Promise<void> {
    await manager.query(
      `UPDATE idempotency_keys
       SET status = $2, response_body = $3, response_status = $4, updated_at = NOW()
       WHERE key = $1`,
      [
        key,
        IdempotencyStatuses.COMPLETED,
        JSON.stringify(responseBody),
        responseStatus,
      ],
    );
  }
}
