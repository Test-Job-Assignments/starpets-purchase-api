import { Injectable } from '@nestjs/common';

import { User } from './user';
import { UserEntity } from './user.entity';

@Injectable()
export class UserMapper {
  toDomain(entity: UserEntity): User {
    return {
      id: entity.id,
      balance: BigInt(entity.balance),
    };
  }
}
