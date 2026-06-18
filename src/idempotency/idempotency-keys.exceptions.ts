import { InternalServerErrorException } from '@nestjs/common';

export class InvalidIdempotencyResponseBodyException extends InternalServerErrorException {
  constructor() {
    super(
      'Stored idempotency response body does not match any supported response schema',
    );
  }
}

export class CorruptedIdempotencyRecordException extends InternalServerErrorException {
  constructor() {
    super('Stored idempotency record is corrupted');
  }
}
