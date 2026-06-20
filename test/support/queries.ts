import { DataSource } from 'typeorm';

export async function getUserBalance(
  dataSource: DataSource,
  userId: string,
): Promise<string> {
  const rows: { balance: string }[] = await dataSource.query(
    'SELECT balance FROM users WHERE id = $1',
    [userId],
  );
  return rows[0].balance;
}

export async function getProductStatus(
  dataSource: DataSource,
  productId: string,
): Promise<string> {
  const rows: { status: string }[] = await dataSource.query(
    'SELECT status FROM products WHERE id = $1',
    [productId],
  );
  return rows[0].status;
}

export async function countPurchasesForProduct(
  dataSource: DataSource,
  productId: string,
): Promise<number> {
  const rows: { count: string }[] = await dataSource.query(
    'SELECT COUNT(*) FROM purchases WHERE product_id = $1',
    [productId],
  );
  return Number(rows[0].count);
}

export async function countPurchases(dataSource: DataSource): Promise<number> {
  const rows: { count: string }[] = await dataSource.query(
    'SELECT COUNT(*) FROM purchases',
  );
  return Number(rows[0].count);
}

export async function countOutboxEvents(
  dataSource: DataSource,
): Promise<number> {
  const rows: { count: string }[] = await dataSource.query(
    'SELECT COUNT(*) FROM outbox_events',
  );
  return Number(rows[0].count);
}

export interface OutboxEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  last_error: string | null;
  published_at: Date | null;
}

export async function getLatestOutboxEvent(
  dataSource: DataSource,
): Promise<OutboxEventRow | undefined> {
  const rows: OutboxEventRow[] = await dataSource.query(
    'SELECT * FROM outbox_events ORDER BY created_at DESC LIMIT 1',
  );
  return rows[0];
}

export interface IdempotencyKeyRow {
  key: string;
  request_hash: string;
  status: string;
  response_body: Record<string, unknown> | null;
  response_status: number | null;
}

export async function getIdempotencyKey(
  dataSource: DataSource,
  key: string,
): Promise<IdempotencyKeyRow | undefined> {
  const rows: IdempotencyKeyRow[] = await dataSource.query(
    'SELECT * FROM idempotency_keys WHERE key = $1',
    [key],
  );
  return rows[0];
}
