import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

import { EnvVar } from '@/common/constants/env-vars.enum';

import { OutboxEventsRepository } from './outbox-events.repository';
import { RabbitMqPublisher } from './rabbitmq-publisher';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_BATCH_SIZE = 10;
const TIMER_NAME = 'outbox-poller';

// Node's happy-eyeballs dual-stack connect (IPv6 + IPv4 in parallel) makes
// amqplib reject with an AggregateError whose own .message is always "" —
// the real reasons live in .errors. Without unwrapping it, last_error would
// be stored as an empty string, defeating its purpose for diagnosing outages.
function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map((inner) => describeError(inner)).join('; ');
  }
  if (error instanceof Error) {
    return error.message || error.toString();
  }
  return String(error);
}

@Injectable()
export class OutboxPoller implements OnModuleInit {
  private readonly logger = new Logger(OutboxPoller.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxEventsRepository: OutboxEventsRepository,
    private readonly publisher: RabbitMqPublisher,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(
      this.configService.get(EnvVar.OUTBOX_POLL_INTERVAL_MS) ??
        DEFAULT_POLL_INTERVAL_MS,
    );
    const timer = setInterval(() => {
      this.poll().catch((error: Error) =>
        this.logger.error('Outbox poll cycle failed', error.stack),
      );
    }, intervalMs);
    this.schedulerRegistry.addInterval(TIMER_NAME, timer);
  }

  async poll(): Promise<void> {
    const batchSize = Number(
      this.configService.get(EnvVar.OUTBOX_BATCH_SIZE) ?? DEFAULT_BATCH_SIZE,
    );

    await this.dataSource.transaction(async (manager) => {
      const events = await this.outboxEventsRepository.lockUnpublishedBatch(
        manager,
        batchSize,
      );

      for (const event of events) {
        try {
          await this.publisher.publish(event.eventType, event.payload);
          await this.outboxEventsRepository.markPublished(manager, event.id);
        } catch (error) {
          await this.outboxEventsRepository.markFailed(
            manager,
            event.id,
            describeError(error),
          );
        }
      }
    });
  }
}
