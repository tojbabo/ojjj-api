import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {logger} from './utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['error', 'warn']
  });
  await app.listen(process.env.PORT ?? 3000);
  logger.info(`Server Start - ${3000}`)
}
bootstrap();
