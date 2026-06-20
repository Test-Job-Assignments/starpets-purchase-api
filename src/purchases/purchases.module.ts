import { Module } from '@nestjs/common';

import { IdGenerator } from '@/common/id-generator';
import { IdempotencyModule } from '@/idempotency/idempotency.module';
import { OutboxModule } from '@/outbox/outbox.module';
import { ProductsModule } from '@/products/products.module';
import { UsersModule } from '@/users/users.module';

import { PurchaseConverter } from './purchase.converter';
import { PurchaseMapper } from './purchase.mapper';
import { PurchasesController } from './purchases.controller';
import { PurchasesRepository } from './purchases.repository';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [IdempotencyModule, ProductsModule, UsersModule, OutboxModule],
  controllers: [PurchasesController],
  providers: [
    PurchasesService,
    PurchasesRepository,
    PurchaseMapper,
    PurchaseConverter,
    IdGenerator,
  ],
})
export class PurchasesModule {}
