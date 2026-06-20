import { HttpStatus } from '@nestjs/common';

import { OutboxEventsRepository } from '@/outbox/outbox-events.repository';

import { postPurchase } from './support/http';
import {
  countOutboxEvents,
  countPurchases,
  getIdempotencyKey,
  getProductStatus,
  getUserBalance,
} from './support/queries';
import { seedProduct, seedUser } from './support/seed';
import {
  bootstrapTestApp,
  shutdownTestApp,
  TestAppContext,
  truncateAll,
} from './support/test-app';

describe('Purchases — transaction rollback on unexpected failure (integration)', () => {
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

  it('Scenario 15 — rolls back balances/status/purchase/outbox when a write fails mid-transaction, and the key is reusable afterwards', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const outboxRepository = ctx.app.get(OutboxEventsRepository);
    const insertSpy = jest
      .spyOn(outboxRepository, 'insert')
      .mockRejectedValueOnce(new Error('simulated failure'));

    const failed = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-15',
    );

    expect(failed.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('10000');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('5000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe(
      'available',
    );
    expect(await countPurchases(ctx.dataSource)).toBe(0);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(0);

    const idempotencyKeyAfterFailure = await getIdempotencyKey(
      ctx.dataSource,
      'key-15',
    );
    expect(idempotencyKeyAfterFailure).toBeUndefined();

    insertSpy.mockRestore();

    const retried = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-15',
    );

    expect(retried.status).toBe(HttpStatus.CREATED);
    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('7000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe('sold');
    expect(await countOutboxEvents(ctx.dataSource)).toBe(1);
  });
});
