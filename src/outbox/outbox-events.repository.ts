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
}
