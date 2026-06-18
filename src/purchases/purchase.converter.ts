import { Injectable } from '@nestjs/common';

import { PurchaseRequest } from './purchase.request';
import { PurchaseResponse as PurchaseResponse } from './purchase-response';
import { CreatePurchaseInput, CreatePurchaseResult } from './purchases.service';
import { computeRequestHash } from './request-hash';

@Injectable()
export class PurchaseConverter {
  toResponse(result: CreatePurchaseResult): PurchaseResponse {
    return {
      purchaseId: result.purchaseId,
    };
  }

  toInput(
    request: PurchaseRequest,
    idempotencyKey: string,
  ): CreatePurchaseInput {
    return {
      buyerId: request.buyerId,
      productId: request.productId,
      idempotencyKey,
      requestHash: computeRequestHash(request),
    };
  }
}
