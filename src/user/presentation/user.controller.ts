import { Body, Controller, Post, Res, Req, Get, Headers } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AppService } from '../../app.service';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';
import { APILIST }  from '../constants';



@Controller('api/user')
export class UserController {
  constructor(
    private readonly appService: AppService, 
    private readonly dynamoDBService: DynamoDBService,
    private readonly usecase: AuthUsecase
  ) {}

  @Get('/apilist')
  async reqApiList(): Promise<any> {
    logger.info(`api/user/apilist - request api list`);

    return {
      list: APILIST
    }
  }

  @Post('/apilist')
  async reqApiList_post(@Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/applist<post> - request api list`);
    const token = auth?.replace('Bearer ', ''); // "Bearer " 제거
    const userid = await this.usecase.extractID(token);

    logger.info(`request user : ${userid}`)
    
    return {
      list: APILIST
    }
  }

  @Post('/addapi')
  async addingApi(@Body() body: {id:number}, @Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/addapi - adding api token`);
    const token = auth?.replace('Bearer ', ''); // "Bearer " 제거
    console.log(token)
    this.usecase.extractID(token);

    
    return {
      list: APILIST
    }
  }

  



}

