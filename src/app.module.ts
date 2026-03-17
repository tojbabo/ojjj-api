import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DynamoDBService } from './dynamodb.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DynamoDBService],
})
export class AppModule {}
