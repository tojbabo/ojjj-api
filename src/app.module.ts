import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthUsecase } from './auth/auth.usecase';
import { ServiceUsecase } from './service/service.usecase';
import { AuthController } from './auth/auth.controller';
import { ServiceController } from './service/service.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DynamoDBRepo } from './dynamodb.repo';
import { ApiUsecase } from './api/api.usecase';
import { ApiRepo } from './api/api.repo';
import { ApiController } from './api/api.controller';
import { ServiceRepo } from './service/service.repo';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    })
  ],
  controllers: [AppController, AuthController, ServiceController, ApiController],
  providers: [
    AppService, DynamoDBRepo,
    AuthUsecase, ServiceUsecase, ApiUsecase,
    ApiRepo, ServiceRepo],
})
export class AppModule {}
