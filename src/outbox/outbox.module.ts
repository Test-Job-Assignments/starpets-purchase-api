import { Module } from '@nestjs/common';

import { OutboxEventMapper } from './outbox-event.mapper';
import { OutboxEventsRepository } from './outbox-events.repository';

@Module({
  providers: [OutboxEventMapper, OutboxEventsRepository],
  exports: [OutboxEventsRepository],
})
export class OutboxModule {}
