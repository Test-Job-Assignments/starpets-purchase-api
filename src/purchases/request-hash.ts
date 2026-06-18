import { createHash } from 'node:crypto';

import { PurchaseRequest } from './purchase.request';

export function computeRequestHash(dto: PurchaseRequest): string {
  return createHash('sha256')
    .update(JSON.stringify({ buyerId: dto.buyerId, productId: dto.productId }))
    .digest('hex');
}
