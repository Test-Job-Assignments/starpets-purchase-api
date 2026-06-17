import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Purchase } from '../domain/purchase';

@Injectable()
export class PurchasesRepository {
  async insert(manager: EntityManager, purchase: Purchase): Promise<void> {
    await manager.query(
      `INSERT INTO purchases (id, product_id, buyer_id, price_paid, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [purchase.id, purchase.productId, purchase.buyerId, purchase.pricePaid],
    );
  }
}
