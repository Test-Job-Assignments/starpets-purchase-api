import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { OutboxEvent } from './outbox-event';
import { OutboxEventEntity } from './outbox-event.entity';
import { OutboxEventMapper } from './outbox-event.mapper';

@Injectable()
export class OutboxEventsRepository {
  constructor(private readonly mapper: OutboxEventMapper) {}

  async insert(manager: EntityManager, event: OutboxEvent): Promise<void> {
    await manager.insert(OutboxEventEntity, this.mapper.toEntity(event));
  }

  async lockUnpublishedBatch(
    manager: EntityManager,
    limit: number,
  ): Promise<OutboxEvent[]> {
    const entities = await manager
      .createQueryBuilder(OutboxEventEntity, 'event')
      .where('event.publishedAt IS NULL')
      .orderBy('event.createdAt', 'ASC')
      .addOrderBy('event.id', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
    return entities.map((entity) => this.mapper.toDomain(entity));
  }

  async markPublished(manager: EntityManager, id: string): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(OutboxEventEntity)
      .set({
        publishedAt: () => 'NOW()',
        attempts: () => 'attempts + 1',
        lastError: null,
      })
      .where('id = :id', { id })
      .execute();
  }

  async markFailed(
    manager: EntityManager,
    id: string,
    errorMessage: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(OutboxEventEntity)
      .set({
        attempts: () => 'attempts + 1',
        lastError: errorMessage,
      })
      .where('id = :id', { id })
      .execute();
  }
}
