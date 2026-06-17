import { ProductStatuses } from '../enums/product-statuses.enum';

export class Product {
  constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly price: string,
    public readonly status: ProductStatuses,
  ) {}
}
