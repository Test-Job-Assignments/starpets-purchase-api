import { AbstractDomain } from '@/common/domain/abstract.domain';

export class Purchase extends AbstractDomain {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly buyerId: string,
    public readonly pricePaid: string,
  ) {
    super();
  }
}
