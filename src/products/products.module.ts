import { Module } from '@nestjs/common';

import { ProductMapper } from './product.mapper';
import { ProductsRepository } from './products.repository';

@Module({
  providers: [ProductMapper, ProductsRepository],
  exports: [ProductsRepository],
})
export class ProductsModule {}
