import { HttpStatus } from '@nestjs/common';

import { postPurchase } from './support/http';
import {
  countOutboxEvents,
  getLatestOutboxEvent,
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

describe('Purchases — successful purchase (integration)', () => {
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

  it('debits buyer, credits seller, marks product sold, creates purchase and outbox row', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-1',
    );

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toHaveProperty('purchaseId');

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('7000');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('8000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe('sold');

    expect(await countOutboxEvents(ctx.dataSource)).toBe(1);
    const event = await getLatestOutboxEvent(ctx.dataSource);
    expect(event?.event_type).toBe('purchase.created');
    expect(event?.payload).toMatchObject({
      purchaseId: response.body.purchaseId,
      productId,
      buyerId,
      sellerId,
      price: '3000',
    });
    expect(event?.published_at).toBeNull();
    expect(event?.attempts).toBe(0);
  });
});
