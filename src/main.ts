import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {logger} from './utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['error', 'warn']
  });
  app.enableCors({
    origin: [
      'http://127.0.0.1', 
      'http://127.0.0.1:3000', 
      'http://127.0.0.1:3001', 
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
