import 'dotenv/config';

import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { IdempotencyKeyEntity } from '@/idempotency/idempotency-key.entity';
import { OutboxEventEntity } from '@/outbox/outbox-event.entity';
import { ProductEntity } from '@/products/product.entity';
import { PurchaseEntity } from '@/purchases/purchase.entity';
import { UserEntity } from '@/users/user.entity';

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USERNAME = 'postgres';
const DEFAULT_DB_PASSWORD = 'postgres';
const DEFAULT_DB_NAME = 'starpets';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
  port: Number(process.env.DB_PORT ?? DEFAULT_DB_PORT),
  username: process.env.DB_USERNAME ?? DEFAULT_DB_USERNAME,
  password: process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
  database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  entities: [
    UserEntity,
    ProductEntity,
    PurchaseEntity,
    OutboxEventEntity,
    IdempotencyKeyEntity,
  ],
  logging: process.env.NODE_ENV !== 'test',
  migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
