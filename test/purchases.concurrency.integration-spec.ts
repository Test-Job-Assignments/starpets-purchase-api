import { HttpStatus } from '@nestjs/common';

import { postPurchase } from './support/http';
import {
  countOutboxEvents,
  countPurchasesForProduct,
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

const CREATED: number = HttpStatus.CREATED;
const CONFLICT: number = HttpStatus.CONFLICT;

describe('Purchases — concurrency (integration)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 120_000);

  afterAll(async () => {
    await shutdownTestApp(ctx);
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('Scenario 11 — exactly one of N concurrent purchases of the same product succeeds', async () => {
    const buyers = await Promise.all(
      Array.from({ length: 5 }, () => seedUser(ctx.dataSource, 10_000)),
    );
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const responses = await Promise.all(
      buyers.map((buyerId, index) =>
        postPurchase(ctx.app, { buyerId, productId }, `key-11-${index}`),
      ),
    );

    const succeeded = responses.filter((r) => r.status === CREATED);
    const rejected = responses.filter((r) => r.status === CONFLICT);

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(buyers.length - 1);

    expect(await getProductStatus(ctx.dataSource, productId)).toBe('sold');
    expect(await countPurchasesForProduct(ctx.dataSource, productId)).toBe(1);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(1);

    const winnerId = buyers[responses.indexOf(succeeded[0])];
    for (const buyerId of buyers) {
      const expected = buyerId === winnerId ? '7000' : '10000';
      expect(await getUserBalance(ctx.dataSource, buyerId)).toBe(expected);
    }
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('8000');
  });

  it('Scenario 12 — concurrent purchases by the same buyer cannot double-spend', async () => {
    const buyerId = await seedUser(ctx.dataSource, 3_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productA = await seedProduct(ctx.dataSource, sellerId, 3_000);
    const productB = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const [responseA, responseB] = await Promise.all([
      postPurchase(ctx.app, { buyerId, productId: productA }, 'key-12-a'),
      postPurchase(ctx.app, { buyerId, productId: productB }, 'key-12-b'),
    ]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual(
      [HttpStatus.CREATED, HttpStatus.UNPROCESSABLE_ENTITY].sort(),
    );

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('0');

    const statusA = await getProductStatus(ctx.dataSource, productA);
    const statusB = await getProductStatus(ctx.dataSource, productB);
    expect([statusA, statusB].sort()).toEqual(['available', 'sold']);
  });

  it('Scenario 13 — reversed buyer/seller pairs do not deadlock', async () => {
    const userA = await seedUser(ctx.dataSource, 10_000);
    const userB = await seedUser(ctx.dataSource, 10_000);
    const productX = await seedProduct(ctx.dataSource, userA, 1_000);
    const productY = await seedProduct(ctx.dataSource, userB, 1_000);

    const [responseX, responseY] = await Promise.all([
      postPurchase(
        ctx.app,
        { buyerId: userB, productId: productX },
        'key-13-x',
      ),
      postPurchase(
        ctx.app,
        { buyerId: userA, productId: productY },
        'key-13-y',
      ),
    ]);

    expect(responseX.status).toBe(HttpStatus.CREATED);
    expect(responseY.status).toBe(HttpStatus.CREATED);

    expect(await getUserBalance(ctx.dataSource, userA)).toBe('10000');
    expect(await getUserBalance(ctx.dataSource, userB)).toBe('10000');
    expect(await getProductStatus(ctx.dataSource, productX)).toBe('sold');
    expect(await getProductStatus(ctx.dataSource, productY)).toBe('sold');
  }, 15_000);

  it('Scenario 14 — concurrent duplicate requests block and share the same cached response', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        postPurchase(ctx.app, { buyerId, productId }, 'key-14'),
      ),
    );

    for (const response of responses) {
      expect(response.status).toBe(HttpStatus.CREATED);
    }
    const purchaseIds = new Set(responses.map((r) => r.body.purchaseId));
    expect(purchaseIds.size).toBe(1);

    expect(await countPurchasesForProduct(ctx.dataSource, productId)).toBe(1);
    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('7000');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('8000');
    expect(await countOutboxEvents(ctx.dataSource)).toBe(1);

    const idempotencyKey = await getIdempotencyKey(ctx.dataSource, 'key-14');
    expect(idempotencyKey?.status).toBe('completed');
  });
});
