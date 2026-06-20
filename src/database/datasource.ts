import 'dotenv/config';

import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { IdempotencyKeyEntity } from '@/idempotency/idempotency-key.entity';
import { OutboxEventEntity } from '@/outbox/outbox-event.entity';
import { ProductEntity } from '@/products/product.entity';
import { PurchaseEntity } from '@/purchases/purchase.entity';
import { UserEntity } from '@/users/user.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'starpets',
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
