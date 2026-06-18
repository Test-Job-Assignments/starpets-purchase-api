import { Module } from '@nestjs/common';

import { IdempotencyKeyMapper } from './idempotency-key.mapper';
import { IdempotencyKeysRepository } from './idempotency-keys.repository';

@Module({
  providers: [IdempotencyKeyMapper, IdempotencyKeysRepository],
  exports: [IdempotencyKeysRepository],
})
export class IdempotencyModule {}
