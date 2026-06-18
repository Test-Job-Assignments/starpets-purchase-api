import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Purchase } from './purchase';
import { PurchaseEntity } from './purchase.entity';
import { PurchaseMapper } from './purchase.mapper';

@Injectable()
export class PurchasesRepository {
  constructor(private readonly purchaseMapper: PurchaseMapper) {}

  async insert(manager: EntityManager, purchase: Purchase): Promise<void> {
    await manager.insert(
      PurchaseEntity,
      this.purchaseMapper.toEntity(purchase),
    );
  }
}
