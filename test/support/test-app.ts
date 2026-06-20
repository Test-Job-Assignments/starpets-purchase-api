import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';

import { startPostgresContainer, startRabbitMqContainer } from './containers';

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
  postgres: StartedTestContainer;
  rabbitmq: StartedTestContainer;
}

export interface BootstrapOptions {
  // Most scenarios assert on outbox_events rows the way the purchase
  // transaction itself leaves them (published_at IS NULL) and never wait for
  // a poll cycle. The poller still runs in the background on a real timer,
  // so a short interval would race with those assertions and flakily
  // publish the row before the test reads it. Default to an interval longer
  // than any test run so it never fires unless a scenario opts in.
  outboxPollIntervalMs?: number;
}

// AppModule (via src/database/datasource.ts) reads DB_HOST/RABBITMQ_CONNECTION/etc.
// from process.env at *import* time, not through a runtime-injected config factory.
// A static top-level `import` would be evaluated before the containers below even
// start, so AppModule must be require()'d lazily, after the env vars are set.
export async function bootstrapTestApp(
  options: BootstrapOptions = {},
): Promise<TestAppContext> {
  const postgres = await startPostgresContainer();
  const rabbitmq = await startRabbitMqContainer();

  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = postgres.getHost();
  process.env.DB_PORT = String(postgres.getMappedPort(5432));
  process.env.DB_USERNAME = 'postgres';
  process.env.DB_PASSWORD = 'postgres';
  process.env.DB_NAME = 'starpets_test';
  process.env.RABBITMQ_CONNECTION = `amqp://guest:guest@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`;
  process.env.RABBITMQ_EXCHANGE = 'purchase-events';
  process.env.OUTBOX_POLL_INTERVAL_MS = String(
    options.outboxPollIntervalMs ?? 3_600_000,
  );
  process.env.OUTBOX_BATCH_SIZE = '10';

  const { AppModule } = require('@/app.module') as typeof import('@/app.module');
  const { HttpExceptionFilter } =
    require('@/common/http-exception.filter') as typeof import('@/common/http-exception.filter');

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

  return { app, dataSource, postgres, rabbitmq };
}

export async function shutdownTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
  await ctx.postgres.stop();
  await ctx.rabbitmq.stop();
}

export async function truncateAll(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE purchases, outbox_events, idempotency_keys, products, users RESTART IDENTITY CASCADE',
  );
}
