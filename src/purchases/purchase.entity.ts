import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';

import { ProductEntity } from '@/products/product.entity';
import { UserEntity } from '@/users/user.entity';

@Entity('purchases')
@Unique('ux_purchases_product_id', ['productId'])
export class PurchaseEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @OneToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @Column('uuid', { name: 'buyer_id' })
  buyerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'buyer_id' })
  buyer?: UserEntity;

  @Column('bigint', { name: 'price_paid' })
  pricePaid!: string;

  // Set explicitly via NOW() in raw SQL — purchases are inserted through
  // manager.query() inside the purchase transaction, bypassing @CreateDateColumn.
  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt!: Date;
}
