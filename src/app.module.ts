import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthUsecase } from './auth/application/login.usecase';
import { AuthController } from './auth/presentation/auth.controller';
import { AppService } from './app.service';
import { DynamoDBService } from './dynamodb.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    })
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, DynamoDBService, AuthUsecase],
})
export class AppModule {}
