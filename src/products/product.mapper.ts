import { Injectable } from '@nestjs/common';

import { Mapper } from '@/common/mapper.interface';

import { Product } from './product';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductMapper implements Mapper<ProductEntity, Product> {
  toDomain(entity: ProductEntity): Product {
    return {
      id: entity.id,
      sellerId: entity.sellerId,
      price: entity.price,
      status: entity.status,
    };
  }

  toEntity(domain: Product): ProductEntity {
    return {
      id: domain.id,
      sellerId: domain.sellerId,
      price: domain.price,
      status: domain.status,
    };
  }
}
