import { randomUUID } from 'node:crypto';

import { HttpStatus } from '@nestjs/common';

import { ProductStatuses } from '@/products/product-statuses.enum';

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

describe('Purchases — validation and business-rule rejections (integration)', () => {
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

  it('Scenario 2 — rejects a purchase of an already-sold product', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(
      ctx.dataSource,
      sellerId,
      3_000,
      'sold',
    );

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-2',
    );

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body.message).toBe('Product is no longer available');

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('10000');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('5000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe('sold');
    expect(await countPurchases(ctx.dataSource)).toBe(0);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(0);

    const idempotencyKey = await getIdempotencyKey(ctx.dataSource, 'key-2');
    expect(idempotencyKey?.status).toBe('completed');
    expect(idempotencyKey?.response_status).toBe(HttpStatus.CONFLICT);
  });

  it('Scenario 3 — rejects a purchase when the buyer has insufficient balance', async () => {
    const buyerId = await seedUser(ctx.dataSource, 100);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-3',
    );

    expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(response.body.message).toBe('Insufficient balance');

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('100');
    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('5000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe('available');
    expect(await countPurchases(ctx.dataSource)).toBe(0);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(0);

    const idempotencyKey = await getIdempotencyKey(ctx.dataSource, 'key-3');
    expect(idempotencyKey?.status).toBe('completed');
    expect(idempotencyKey?.response_status).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('Scenario 3b — succeeds when the buyer balance exactly equals the price', async () => {
    const buyerId = await seedUser(ctx.dataSource, 3_000);
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-3b',
    );

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('0');
  });

  it('Scenario 4 — rejects a purchase for a non-existent product', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const productId = randomUUID();

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-4',
    );

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe('Product not found');

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('10000');
    expect(await countPurchases(ctx.dataSource)).toBe(0);
    expect(await countOutboxEvents(ctx.dataSource)).toBe(0);
  });

  it('Scenario 5 — rejects a purchase from a non-existent buyer', async () => {
    const sellerId = await seedUser(ctx.dataSource, 5_000);
    const productId = await seedProduct(ctx.dataSource, sellerId, 3_000);
    const buyerId = randomUUID();

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-5',
    );

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe('Buyer not found');

    expect(await getUserBalance(ctx.dataSource, sellerId)).toBe('5000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe(
      ProductStatuses.AVAILABLE,
    );
    expect(await countPurchases(ctx.dataSource)).toBe(0);
  });

  it('Scenario 6 — rejects a purchase whose product references a non-existent seller', async () => {
    const buyerId = await seedUser(ctx.dataSource, 10_000);
    const productId = randomUUID();
    const danglingSellerId = randomUUID();

    // The FK products.seller_id -> users.id makes a dangling seller_id
    // unreachable through normal inserts; disable FK enforcement for this
    // one seed statement only, to exercise the `!seller` branch in
    // PurchasesService that the real API can otherwise never reach.
    await ctx.dataSource.query("SET session_replication_role = 'replica'");
    try {
      await ctx.dataSource.query(
        'INSERT INTO products (id, seller_id, price, status) VALUES ($1, $2, $3, $4)',
        [productId, danglingSellerId, '3000', 'available'],
      );
    } finally {
      await ctx.dataSource.query("SET session_replication_role = 'origin'");
    }

    const response = await postPurchase(
      ctx.app,
      { buyerId, productId },
      'key-6',
    );

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe('Seller not found');

    expect(await getUserBalance(ctx.dataSource, buyerId)).toBe('10000');
    expect(await countPurchases(ctx.dataSource)).toBe(0);
  });

  it('Scenario 7 — rejects a purchase where buyer and seller are the same user', async () => {
    const userId = await seedUser(ctx.dataSource, 10_000);
    const productId = await seedProduct(ctx.dataSource, userId, 3_000);

    const response = await postPurchase(
      ctx.app,
      { buyerId: userId, productId },
      'key-7',
    );

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toBe('Buyer and seller must be different');

    expect(await getUserBalance(ctx.dataSource, userId)).toBe('10000');
    expect(await getProductStatus(ctx.dataSource, productId)).toBe(
      ProductStatuses.AVAILABLE,
    );
    expect(await countPurchases(ctx.dataSource)).toBe(0);
  });
});
