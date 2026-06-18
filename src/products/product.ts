import { AbstractDomain } from '@/common/domain/abstract.domain';

import { ProductStatuses } from './product-statuses.enum';

export class Product extends AbstractDomain {
  constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly price: string,
    public readonly status: ProductStatuses,
  ) {
    super();
  }
}
