import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

export async function seedUser(
  dataSource: DataSource,
  balance: string | number,
): Promise<string> {
  const id = randomUUID();
  await dataSource.query('INSERT INTO users (id, balance) VALUES ($1, $2)', [
    id,
    String(balance),
  ]);
  return id;
}

export async function seedProduct(
  dataSource: DataSource,
  sellerId: string,
  price: string | number,
  status: 'available' | 'sold' = 'available',
): Promise<string> {
  const id = randomUUID();
  await dataSource.query(
    'INSERT INTO products (id, seller_id, price, status) VALUES ($1, $2, $3, $4)',
    [id, sellerId, String(price), status],
  );
  return id;
}
