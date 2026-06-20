import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class IdGenerator {
  generate(): string {
    return uuidv7();
  }
}
