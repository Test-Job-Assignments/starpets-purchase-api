import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { JsonB } from '@/common/types/jsonb';

import { IdempotencyStatuses } from './idempotency-statuses.enum';

@Entity('idempotency_keys')
export class IdempotencyKeyEntity {
  @PrimaryColumn('varchar')
  key!: string;

  @Column('varchar', { name: 'request_hash' })
  requestHash!: string;

  @Column('varchar', { length: 16 })
  status!: IdempotencyStatuses;

  @Column('jsonb', { name: 'response_body', nullable: true })
  responseBody!: JsonB | null;

  @Column('int', { name: 'response_status', nullable: true })
  responseStatus!: number | null;

  // created_at/updated_at are set explicitly via NOW() in raw SQL (INSERT ... ON CONFLICT / UPDATE).
  // Plain columns, not @CreateDateColumn/@UpdateDateColumn — those only fire through
  // repository .save(), and the idempotency flow runs entirely through manager.query().
  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt!: Date;

  @Column('timestamp with time zone', {
    name: 'updated_at',
    default: () => 'NOW()',
  })
  updatedAt!: Date;
}
