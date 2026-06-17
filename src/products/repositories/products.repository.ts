import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import ProductEntity from '../entities/product.entity';
import { ProductStatuses } from '../enums/product-statuses.enum';
import { Product } from '../domain/product';
import { ProductMapper } from '../mappers/product.mapper';

// manager is passed per call, not injected — it's scoped to the caller's transaction,
// not to this (singleton) repository's lifetime. See discussion in PurchasesService.
@Injectable()
export class ProductsRepository {
  async lockById(
    manager: EntityManager,
    productId: string,
  ): Promise<Product | undefined> {
    const rows = await manager.query<ProductEntity[]>(
      `SELECT id, seller_id AS "sellerId", price, status
       FROM products WHERE id = $1 FOR UPDATE`,
      [productId],
    );
    const row = rows[0];
    return row ? ProductMapper.toDomain(row) : undefined;
  }

  async markSold(manager: EntityManager, productId: string): Promise<void> {
    await manager.query('UPDATE products SET status = $1 WHERE id = $2', [
      ProductStatuses.SOLD,
      productId,
    ]);
  }
}
