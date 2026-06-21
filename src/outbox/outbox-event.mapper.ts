import { Injectable } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { JsonB } from '@/common/jsonb';

import { OutboxEvent } from './outbox-event';
import { OutboxEventEntity } from './outbox-event.entity';

@Injectable()
export class OutboxEventMapper {
  toDomain(entity: OutboxEventEntity): OutboxEvent {
    return {
      id: entity.id,
      eventType: entity.eventType,
      payload: entity.payload,
    };
  }

  toEntity(domain: OutboxEvent): QueryDeepPartialEntity<OutboxEventEntity> {
    return {
      id: domain.id,
      eventType: domain.eventType,
      // QueryDeepPartialEntity only accepts index-signature columns typed
      // `any` (JsonB), not the domain type's `unknown` — see jsonb.ts.
      payload: domain.payload as JsonB,
    };
  }
}
