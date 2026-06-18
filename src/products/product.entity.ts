import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AbstractEntity } from '@/common/entities/abstract.entity';
import { UserEntity } from '@/users/user.entity';

import { ProductStatuses } from './product-statuses.enum';

@Entity('products')
@Check('price_positive', '"price" > 0')
@Check(
  'status_valid',
  `"status" IN ('${ProductStatuses.AVAILABLE}', '${ProductStatuses.SOLD}')`,
)
export class ProductEntity extends AbstractEntity {
  @PrimaryColumn('uuid')
  id!: string;

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
