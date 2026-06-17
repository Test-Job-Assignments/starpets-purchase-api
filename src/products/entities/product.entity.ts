import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import AbstractEntity from '@/common/entities/abstract.entity';
import UserEntity from '@/users/entities/user.entity';
import { ProductStatuses } from '../enums/product-statuses.enum';

@Entity('products')
@Check('price_positive', '"price" > 0')
@Check(
  'status_valid',
  `"status" IN ('${ProductStatuses.AVAILABLE}', '${ProductStatuses.SOLD}')`,
)
export default class ProductEntity extends AbstractEntity {
  @Column('uuid', { name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'seller_id' })
  seller?: UserEntity;

  @Column('bigint')
  price!: string;

  @Column('varchar', { length: 16, default: ProductStatuses.AVAILABLE })
  status!: ProductStatuses;
}
