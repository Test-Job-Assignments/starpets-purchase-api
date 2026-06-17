import { Check, Column, Entity } from 'typeorm';
import AbstractEntity from '@/common/entities/abstract.entity';

@Entity('users')
@Check('balance_non_negative', '"balance" >= 0')
export default class UserEntity extends AbstractEntity {
  @Column('bigint')
  balance!: string;
}
