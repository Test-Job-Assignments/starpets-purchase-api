import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import UserEntity from '../entities/user.entity';
import { User } from '../domain/user';
import { UserMapper } from '../mappers/user.mapper';

// manager is passed per call, not injected — it's scoped to the caller's transaction,
// not to this (singleton) repository's lifetime. See discussion in PurchasesService.
@Injectable()
export class UsersRepository {
  async lockByIds(manager: EntityManager, userIds: string[]): Promise<User[]> {
    const rows = await manager.query<UserEntity[]>(
      'SELECT id, balance FROM users WHERE id = ANY($1) ORDER BY id FOR UPDATE',
      [[...userIds].sort()],
    );
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async debit(
    manager: EntityManager,
    userId: string,
    amount: string,
  ): Promise<void> {
    await manager.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [amount, userId],
    );
  }

  async credit(
    manager: EntityManager,
    userId: string,
    amount: string,
  ): Promise<void> {
    await manager.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount, userId],
    );
  }
}
