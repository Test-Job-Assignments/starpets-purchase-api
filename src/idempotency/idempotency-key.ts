import { AbstractDomain } from '@/common/domain/abstract.domain';

import { IdempotencyStatuses } from './idempotency-statuses.enum';

export class IdempotencyKey extends AbstractDomain {
  constructor(
    public readonly key: string,
    public readonly requestHash: string,
    public readonly status: IdempotencyStatuses,
    public readonly responseBody: Record<string, unknown> | null,
    public readonly responseStatus: number | null,
  ) {
    super();
  }
}
