import { HttpStatus } from '@nestjs/common';

import { IdempotencyStatuses } from './idempotency-statuses.enum';

export type BodyWithPurchaseId = { purchaseId: string };
export type BodyWithErrorMessage = { message: string };

export type IdempotencyKey = ProcessingIdempotencyKey | CompletedIdempotencyKey;

export type ProcessingIdempotencyKey = Readonly<{
  key: string;
  requestHash: string;
  status: IdempotencyStatuses.PROCESSING;
  responseBody: null;
  responseStatus: null;
}>;

export type CompletedIdempotencyKey = Readonly<{
  key: string;
  requestHash: string;
  status: IdempotencyStatuses.COMPLETED;
  responseBody: BodyWithPurchaseId | BodyWithErrorMessage;
  responseStatus: HttpStatus;
}>;
