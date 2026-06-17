import ProductEntity from '../entities/product.entity';
import { Product } from '../domain/product';

export class ProductMapper {
  static toDomain(entity: ProductEntity): Product {
    return new Product(entity.id, entity.sellerId, entity.price, entity.status);
  }
}
