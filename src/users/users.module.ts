import { Module } from '@nestjs/common';

import { UserMapper } from './user.mapper';
import { UsersRepository } from './users.repository';

@Module({
  providers: [UserMapper, UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
