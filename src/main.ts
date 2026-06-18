import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { EnvVar } from '@/common/constants/env-vars.enum';
import { HttpExceptionFilter } from '@/common/http-exception.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const configService = app.get(ConfigService);
  await app.listen(configService.get(EnvVar.PORT) ?? 3000);
}
void bootstrap();
