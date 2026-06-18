import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

import { AbstractEntity } from '@/common/entities/abstract.entity';

@Entity('users')
@Check('balance_non_negative', '"balance" >= 0')
export class UserEntity extends AbstractEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('bigint')
  balance!: string;
}
