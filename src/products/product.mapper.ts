import { Injectable } from '@nestjs/common';

import { Product } from './product';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductMapper {
  toDomain(entity: ProductEntity): Product {
    return {
      id: entity.id,
      sellerId: entity.sellerId,
      price: BigInt(entity.price),
      status: entity.status,
    };
  }
}
