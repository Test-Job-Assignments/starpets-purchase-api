import { Column, Entity, Index } from 'typeorm';
import AbstractEntity from '@/common/entities/abstract.entity';
import { OutboxEventTypes } from '../enums/outbox-event-types.enum';

@Entity('outbox_events')
@Index('ix_outbox_events_unpublished', ['createdAt', 'id'], {
  where: 'published_at IS NULL',
})
export default class OutboxEventEntity extends AbstractEntity {
  @Column('varchar', { name: 'event_type' })
  eventType!: OutboxEventTypes;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column('int', { default: 0 })
  attempts!: number;

  @Column('text', { name: 'last_error', nullable: true })
  lastError!: string | null;

  @Column('timestamp with time zone', { name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  // Set explicitly via NOW() in raw SQL — outbox rows are inserted through
  // manager.query() inside the purchase transaction, bypassing @CreateDateColumn.
  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt!: Date;
}
