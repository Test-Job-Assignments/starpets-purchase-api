import { OutboxEventTypes } from '../enums/outbox-event-types.enum';

export class OutboxEvent {
  constructor(
    public readonly id: string,
    public readonly eventType: OutboxEventTypes,
    public readonly payload: Record<string, unknown>,
  ) {}
}
