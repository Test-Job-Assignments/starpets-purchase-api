import { IdempotencyStatuses } from '../enums/idempotency-statuses.enum';

export class IdempotencyKey {
  constructor(
    public readonly key: string,
    public readonly requestHash: string,
    public readonly status: IdempotencyStatuses,
    public readonly responseBody: Record<string, unknown> | null,
    public readonly responseStatus: number | null,
  ) {}
}
