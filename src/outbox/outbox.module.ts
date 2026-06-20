import { Module } from '@nestjs/common';

import { OutboxPoller } from './outbox.poller';
import { OutboxEventMapper } from './outbox-event.mapper';
import { OutboxEventsRepository } from './outbox-events.repository';
import { RabbitMqPublisher } from './rabbitmq-publisher';

@Module({
  providers: [
    OutboxEventMapper,
    OutboxEventsRepository,
    RabbitMqPublisher,
    OutboxPoller,
  ],
  exports: [OutboxEventsRepository],
})
export class OutboxModule {}
