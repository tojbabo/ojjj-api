import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {logger} from './utils/logger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['error', 'warn']
  });
  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://127.0.0.1',
      'http://localhost'
    ],
    // origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
  logger.info(`Server Start - ${3000}`)
}
bootstrap();
