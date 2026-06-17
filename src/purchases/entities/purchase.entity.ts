import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import AbstractEntity from '@/common/entities/abstract.entity';
import UserEntity from '@/users/entities/user.entity';
import ProductEntity from '@/products/entities/product.entity';

@Entity('purchases')
@Unique('ux_purchases_product_id', ['productId'])
export default class PurchaseEntity extends AbstractEntity {
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
