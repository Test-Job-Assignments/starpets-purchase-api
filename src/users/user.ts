import { AbstractDomain } from '@/common/domain/abstract.domain';

export class User extends AbstractDomain {
  constructor(
    public readonly id: string,
    public readonly balance: string,
  ) {
    super();
  }
}
