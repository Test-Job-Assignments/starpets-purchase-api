import { Injectable } from '@nestjs/common';

import { Mapper } from '@/common/mapper.interface';

import { Purchase } from './purchase';
import { PurchaseEntity } from './purchase.entity';

@Injectable()
export class PurchaseMapper implements Mapper<PurchaseEntity, Purchase> {
  toDomain(entity: PurchaseEntity): Purchase {
    return {
      id: entity.id,
      productId: entity.productId,
      buyerId: entity.buyerId,
      pricePaid: entity.pricePaid,
    };
  }

  toEntity(domain: Purchase): PurchaseEntity {
    return {
      id: domain.id,
      productId: domain.productId,
      buyerId: domain.buyerId,
      pricePaid: domain.pricePaid,
    } as PurchaseEntity;
  }
}
