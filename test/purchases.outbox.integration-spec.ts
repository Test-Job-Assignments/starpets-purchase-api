import { HttpStatus } from '@nestjs/common';

import { OutboxPoller } from '@/outbox/outbox.poller';

import { startContainer, stopContainer } from './support/docker';
import { postPurchase } from './support/http';
import { getLatestOutboxEvent } from './support/queries';
import {
  bindTestQueue,
  closeTestQueue,
  RabbitMqTestClient,
  waitForNextMessage,
} from './support/rabbitmq';
import { seedProduct, seedUser } from './support/seed';
import {
  bootstrapTestApp,
  shutdownTestApp,
  TestAppContext,
  truncateAll,
} from './support/test-app';

const EXCHANGE = 'purchase-events';

function rabbitMqUrl(ctx: TestAppContext): string {
  return `amqp://guest:guest@${ctx.rabbitmq.getHost()}:${ctx.rabbitmq.getMappedPort(5672)}`;
}

describe('Purchases — outbox delivery (integration)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await shutdownTestApp(ctx);
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('Scenario 16 — the poller publishes a successful purchase event to RabbitMQ', async () => {
    const queueClient = await bindTestQueue(rabbitMqUrl(ctx), EXCHANGE);

    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-16',
    );
    expect(response.status).toBe(HttpStatus.CREATED);

    await ctx.app.get(OutboxPoller).poll();

    const event = await getLatestOutboxEvent(ctx.dataSource);
    expect(event?.published_at).not.toBeNull();
    expect(event?.attempts).toBe(1);
    expect(event?.last_error).toBeNull();

    const message = await waitForNextMessage(queueClient);
    expect(message?.routingKey).toBe('purchase.created');
    expect(message?.payload).toMatchObject({
      purchaseId: response.body.purchaseId,
      productId,
      buyerId,
      sellerId,
      price: '3000',
    });

    await closeTestQueue(queueClient);
  });

  it('Scenario 17 — a broker outage is recorded with a real error and self-heals once the broker returns, without restarting the app', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    stopContainer(ctx.rabbitmq.getId());
    // Give the publisher's open connection time to receive the broker's
    // close event and clear its channel reference before polling.
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-17',
    );
    expect(response.status).toBe(HttpStatus.CREATED);

    await ctx.app.get(OutboxPoller).poll();

    const afterFailure = await getLatestOutboxEvent(ctx.dataSource);
    expect(afterFailure?.published_at).toBeNull();
    expect(afterFailure?.attempts).toBeGreaterThanOrEqual(1);
    expect(afterFailure?.last_error).toBeTruthy();
    expect(afterFailure?.last_error).not.toBe('');

    startContainer(ctx.rabbitmq.getId());

    let queueClient: RabbitMqTestClient | undefined;
    const deadline = Date.now() + 30_000;
    let recovered = false;
    while (Date.now() < deadline && !recovered) {
      try {
        queueClient ??= await bindTestQueue(rabbitMqUrl(ctx), EXCHANGE);
        await ctx.app.get(OutboxPoller).poll();
        const event = await getLatestOutboxEvent(ctx.dataSource);
        if (event?.published_at) {
          recovered = true;
          break;
        }
      } catch {
        // RabbitMQ may still be coming back up; retry.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(recovered).toBe(true);

    const afterRecovery = await getLatestOutboxEvent(ctx.dataSource);
    expect(afterRecovery?.published_at).not.toBeNull();
    expect(afterRecovery?.last_error).toBeNull();

    if (queueClient) {
      const message = await waitForNextMessage(queueClient);
      expect(message?.routingKey).toBe('purchase.created');
      await closeTestQueue(queueClient);
    }
  }, 60_000);
});
