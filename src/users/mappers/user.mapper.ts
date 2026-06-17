import UserEntity from '../entities/user.entity';
import { User } from '../domain/user';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    return new User(entity.id, entity.balance);
  }
}
