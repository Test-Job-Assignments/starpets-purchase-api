import { Injectable } from '@nestjs/common';

import { Mapper } from '@/common/mapper.interface';

import { OutboxEvent } from './outbox-event';
import { OutboxEventEntity } from './outbox-event.entity';

@Injectable()
export class OutboxEventMapper implements Mapper<
  OutboxEventEntity,
  OutboxEvent
> {
  toDomain(entity: OutboxEventEntity): OutboxEvent {
    return {
      id: entity.id,
      eventType: entity.eventType,
      payload: entity.payload,
    };
  }

  toEntity(domain: OutboxEvent): OutboxEventEntity {
    return {
      id: domain.id,
      eventType: domain.eventType,
      payload: domain.payload,
    } as OutboxEventEntity;
  }
}
