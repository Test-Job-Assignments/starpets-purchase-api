import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import UserEntity from '@/users/entities/user.entity';
import ProductEntity from '@/products/entities/product.entity';
import PurchaseEntity from '@/purchases/entities/purchase.entity';
import OutboxEventEntity from '@/outbox/entities/outbox-event.entity';
import IdempotencyKeyEntity from '@/idempotency/entities/idempotency-key.entity';

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
  migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
