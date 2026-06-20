import { HttpStatus } from '@nestjs/common';

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

describe('Purchases — idempotency (integration)', () => {
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

  it('Scenario 8 — replays the cached success response without duplicating side effects', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const first = await postPurchase(ctx.app, { buyerId, productId }, 'key-8');
    expect(first.status).toBe(HttpStatus.CREATED);

    const second = await postPurchase(ctx.app, { buyerId, productId }, 'key-8');

    // Replay returns the original cached status verbatim (201), not 200 —
    // see decisions.md ADR-003 and the architecture.md correction.
    expect(second.status).toBe(HttpStatus.CREATED);
    expect(second.body.purchaseId).toBe(first.body.purchaseId);

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('7000');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('8000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe('sold');
    expect(await countPurchases(ctx.dataSource)).toBe(1);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(1);
  });

  it('Scenario 9 — replays the cached business error instead of re-evaluating current state', async () => {
    const buyerId = await seedUser(ctx.dataSource, 100);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const first = await postPurchase(ctx.app, { buyerId, productId }, 'key-9');
    expect(first.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

    await ctx.dataSource.query('UPDATE users SET balance = $1 WHERE id = $2', [
      '10000',
      buyerId,
    ]);

    const second = await postPurchase(ctx.app, { buyerId, productId }, 'key-9');

    expect(second.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(second.body.message).toBe('Insufficient balance');

    expect(await getProductStatus(ctx.dataSource, productId)).toBe('available');
    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('10000');
    expect(await countPurchases(ctx.dataSource)).toBe(0);
  });

  it('Scenario 10 — rejects a key reused for a semantically different request', async () => {
    const buyer1 = await seedUser(ctx.dataSource, 10_000);
    const buyer2 = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productA = await seedProduct(ctx.dataSource, sellerId, 3_000);
    const productB = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const first = await postPurchase(
      ctx.app,
      { buyerId: buyer1, productId: productA },
      'key-10',
    );
    expect(first.status).toBe(HttpStatus.CREATED);

    const second = await postPurchase(
      ctx.app,
      { buyerId: buyer2, productId: productB },
      'key-10',
    );

    expect(second.status).toBe(HttpStatus.CONFLICT);
    expect(second.body.message).toBe(
      'Idempotency key was used with a different request',
    );

    expect(await getProductStatus(ctx.dataSource, productA)).toBe('sold');
    expect(await getProductStatus(ctx.dataSource, productB)).toBe('available');
    expect(await getUserBalance(ctx.dataSource, buyer2)).toBe('10000');
    expect(await countPurchases(ctx.dataSource)).toBe(1);

    const idempotencyKey = await getIdempotencyKey(ctx.dataSource, 'key-10');
    expect(idempotencyKey?.response_status).toBe(HttpStatus.CREATED);
  });
});
