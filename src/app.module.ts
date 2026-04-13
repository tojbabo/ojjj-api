import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthUsecase } from './user/application/login.usecase';
import { AuthController } from './user/presentation/auth.controller';
import { UserController } from './user/presentation/user.controller';
import { AppService } from './app.service';
import { DynamoDBService } from './dynamodb.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    })
  ],
  controllers: [AppController, AuthController, UserController],
  providers: [AppService, DynamoDBService, AuthUsecase],
})
export class AppModule {}
