import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';

export function postPurchase(
  app: INestApplication,
  body: { buyerId: string; productId: string },
  idempotencyKey: string,
): Promise<Response> {
  return request(app.getHttpServer())
    .post('/purchases')
    .set('Idempotency-Key', idempotencyKey)
    .send(body);
}
