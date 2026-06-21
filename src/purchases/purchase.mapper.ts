import { Injectable } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { Purchase } from './purchase';
import { PurchaseEntity } from './purchase.entity';

@Injectable()
export class PurchaseMapper {
  toDomain(entity: PurchaseEntity): Purchase {
    return {
      id: entity.id,
      productId: entity.productId,
      buyerId: entity.buyerId,
      pricePaid: BigInt(entity.pricePaid),
    };
  }

  toEntity(domain: Purchase): QueryDeepPartialEntity<PurchaseEntity> {
    return {
      id: domain.id,
      productId: domain.productId,
      buyerId: domain.buyerId,
      pricePaid: domain.pricePaid.toString(),
    };
  }
}
