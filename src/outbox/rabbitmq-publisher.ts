import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, connect } from 'amqplib';

import { EnvVar } from '@/common/env-vars.enum';
import { JsonB } from '@/common/jsonb';

const DEFAULT_EXCHANGE = 'purchase-events';

@Injectable()
export class RabbitMqPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisher.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private connecting?: Promise<void>;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(routingKey: string, payload: JsonB): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const written = this.channel.publish(
      this.exchangeName(),
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: 'application/json' },
    );

    if (!written) {
      throw new Error('RabbitMQ channel write buffer is full');
    }
  }

  // The outbox poller already calls publish() once per retry cycle, so
  // reconnecting lazily here is enough to recover from a dropped broker
  // connection — no separate reconnect scheduler is needed.
  private async connect(): Promise<void> {
    if (!this.connecting) {
      this.connecting = this.establishConnection().finally(() => {
        this.connecting = undefined;
      });
    }
    return this.connecting;
  }

  private async establishConnection(): Promise<void> {
    const url = this.configService.getOrThrow<string>(
      EnvVar.RABBITMQ_CONNECTION,
    );
    const connection = await connect(url);

    // Without these handlers, a dropped connection leaves `this.channel`
    // pointing at a dead object forever — publish() would keep throwing
    // "Channel closed" even after the broker comes back, with no recovery.
    connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
    });
    connection.on('error', (error: Error) => {
      this.logger.error('RabbitMQ connection error', error.stack);
    });

    const channel = await connection.createChannel();
    await channel.assertExchange(this.exchangeName(), 'topic', {
      durable: true,
    });

    this.connection = connection;
    this.channel = channel;
    this.logger.log(
      `Connected to RabbitMQ, exchange "${this.exchangeName()}" asserted`,
    );
  }

  private exchangeName(): string {
    return (
      this.configService.get<string>(EnvVar.RABBITMQ_EXCHANGE) ??
      DEFAULT_EXCHANGE
    );
  }
}
