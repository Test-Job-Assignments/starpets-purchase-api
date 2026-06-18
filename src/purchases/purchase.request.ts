import { IsUUID } from 'class-validator';

export class PurchaseRequest {
  @IsUUID()
  buyerId!: string;

  @IsUUID()
  productId!: string;
}
