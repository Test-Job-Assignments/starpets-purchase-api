import { ProductStatuses } from './product-statuses.enum';

export type Product = Readonly<{
  id: string;
  sellerId: string;
  price: string;
  status: ProductStatuses;
}>;
