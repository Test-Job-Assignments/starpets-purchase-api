import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
@Check('balance_non_negative', '"balance" >= 0')
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('bigint')
  balance!: string;
}
