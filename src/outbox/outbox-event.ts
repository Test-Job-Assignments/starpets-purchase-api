import { OutboxEventTypes } from './outbox-event-types.enum';

export type OutboxEvent = Readonly<{
  id: string;
  eventType: OutboxEventTypes;
  payload: Record<string, unknown>;
}>;
