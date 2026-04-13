import { Body, Controller, Post, Res, Req, Get } from '@nestjs/common';
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
  async authlogin(): Promise<any> {
    logger.info(`api/user/apilist - request api list`);

    return {
      list: APILIST
    }
  }
}

