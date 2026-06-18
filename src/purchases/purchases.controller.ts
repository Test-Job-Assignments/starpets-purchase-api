import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { PurchaseConverter } from './purchase.converter';
import { MissingIdempotencyKeyException } from './purchase.exceptions';
import { PurchaseRequest } from './purchase.request';
import { PurchaseResponse } from './purchase-response';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly purchaseConverter: PurchaseConverter,
  ) {}

  @Post()
  async create(
    @Body() dto: PurchaseRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PurchaseResponse> {
    if (!idempotencyKey) {
      throw new MissingIdempotencyKeyException();
    }

    const result = await this.purchasesService.createPurchase(
      this.purchaseConverter.toInput(dto, idempotencyKey),
    );

    res.status(result.httpStatus);
    return this.purchaseConverter.toResponse(result);
  }
}
