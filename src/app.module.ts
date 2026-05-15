import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthUsecase } from './user/application/login.usecase';
import { UserUsecase } from './user/application/user.usecase';
import { AuthController } from './user/presentation/auth.controller';
import { UserController } from './user/presentation/user.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DynamoDBRepo } from './dynamodb.repo';
import { ApiUsecase } from './user/application/api.usecase';
import { ApiRepo } from './user/infrastructure/api.repo';
import { ApiController } from './user/presentation/api.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    })
  ],
  controllers: [AppController, AuthController, UserController, ApiController],
  providers: [AppService, AuthUsecase, DynamoDBRepo, UserUsecase, ApiUsecase, ApiRepo],
})
export class AppModule {}
