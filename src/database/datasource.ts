import 'dotenv/config';

import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { IdempotencyKeyEntity } from '@/idempotency/idempotency-key.entity';
import { OutboxEventEntity } from '@/outbox/outbox-event.entity';
import { ProductEntity } from '@/products/product.entity';
import { PurchaseEntity } from '@/purchases/purchase.entity';
import { UserEntity } from '@/users/user.entity';

const DEFAULT_DB_CONNECTION =
  'postgresql://postgres:postgres@localhost:5432/starpets';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DB_CONNECTION ?? DEFAULT_DB_CONNECTION,
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
