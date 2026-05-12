import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import {logger} from './utils/logger';
import { DynamoDBRepo } from './dynamodb.repo';


@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService, private readonly dbrepo: DynamoDBRepo) {}

  @Get('/')
  getHello(): string {
    logger.info("say hello")
    return this.appService.getHello();
  }


  @Post('/windows/set')
  async setWindows(@Body() body: any): Promise<number> {
    logger.info(`api/windows/set - windows proc log save`);
    return await this.appService.SavingProcsLog(body);
  }
}
