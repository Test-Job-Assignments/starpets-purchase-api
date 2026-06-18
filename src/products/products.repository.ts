import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Product } from './product';
import { ProductEntity } from './product.entity';
import { ProductMapper } from './product.mapper';
import { ProductStatuses } from './product-statuses.enum';

@Injectable()
export class ProductsRepository {
  constructor(private readonly productMapper: ProductMapper) {}

  async lockById(
    manager: EntityManager,
    productId: string,
  ): Promise<Product | null> {
    const entity = await manager.findOne(ProductEntity, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? this.productMapper.toDomain(entity) : null;
  }

  async markSold(manager: EntityManager, productId: string): Promise<void> {
    await manager.update(ProductEntity, productId, {
      status: ProductStatuses.SOLD,
    });
  }
}
