import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxEvent } from '../domain/outbox-event';

@Injectable()
export class OutboxEventsRepository {
  async insert(manager: EntityManager, event: OutboxEvent): Promise<void> {
    await manager.query(
      `INSERT INTO outbox_events (id, event_type, payload, attempts, created_at)
       VALUES ($1, $2, $3, 0, NOW())`,
      [event.id, event.eventType, JSON.stringify(event.payload)],
    );
  }
}
