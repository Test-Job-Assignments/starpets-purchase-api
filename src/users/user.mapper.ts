import { Injectable } from '@nestjs/common';

import { Mapper } from '@/common/mappers/mapper.interface';

import { User } from './user';
import { UserEntity } from './user.entity';

@Injectable()
export class UserMapper implements Mapper<UserEntity, User> {
  toDomain(entity: UserEntity): User {
    return {
      id: entity.id,
      balance: entity.balance,
    };
  }

  toEntity(domain: User): UserEntity {
    return {
      id: domain.id,
      balance: domain.balance,
    };
  }
}
