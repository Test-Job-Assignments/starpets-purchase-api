import { AbstractDomain } from '@/common/domain/abstract.domain';

import { OutboxEventTypes } from './outbox-event-types.enum';

export class OutboxEvent extends AbstractDomain {
  constructor(
    public readonly id: string,
    public readonly eventType: OutboxEventTypes,
    public readonly payload: Record<string, unknown>,
  ) {
    super();
  }
}
