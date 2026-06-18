import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class ProductNotFoundException extends NotFoundException {
  constructor() {
    super('Product not found');
  }
}

export class BuyerNotFoundException extends NotFoundException {
  constructor() {
    super('Buyer not found');
  }
}

export class SellerNotFoundException extends NotFoundException {
  constructor() {
    super('Seller not found');
  }
}

export class SameBuyerSellerException extends BadRequestException {
  constructor() {
    super('Buyer and seller must be different');
  }
}

export class ProductUnavailableException extends ConflictException {
  constructor() {
    super('Product is no longer available');
  }
}

export class InsufficientBalanceException extends UnprocessableEntityException {
  constructor() {
    super('Insufficient balance');
  }
}

export class IdempotencyConflictException extends ConflictException {
  constructor() {
    super('Idempotency key was used with a different request');
  }
}

export class MissingIdempotencyKeyException extends BadRequestException {
  constructor() {
    super('Idempotency-Key header is required');
  }
}
