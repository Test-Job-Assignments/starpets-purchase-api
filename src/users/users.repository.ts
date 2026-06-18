import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { User } from './user';
import { UserEntity } from './user.entity';
import { UserMapper } from './user.mapper';

@Injectable()
export class UsersRepository {
  constructor(private readonly userMapper: UserMapper) {}

  async lockByIds(manager: EntityManager, userIds: string[]): Promise<User[]> {
    const entities = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id IN (:...ids)', { ids: userIds })
      .orderBy('user.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    return entities.map((entity) => this.userMapper.toDomain(entity));
  }

  async debit(
    manager: EntityManager,
    userId: string,
    amount: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(UserEntity)
      .set({ balance: () => 'balance - :amount' })
      .where('id = :id', { id: userId })
      .setParameter('amount', amount)
      .execute();
  }

  async credit(
    manager: EntityManager,
    userId: string,
    amount: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(UserEntity)
      .set({ balance: () => 'balance + :amount' })
      .where('id = :id', { id: userId })
      .setParameter('amount', amount)
      .execute();
  }
}
