import { Body, Controller, Post, Res, Req, Get, Headers } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AppService } from '../../app.service';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';
import { APILIST }  from '../constants';
import * as crypto from 'crypto';



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
    const token = auth?.replace('Bearer ', '').trim(); // "Bearer " 제거
    const userid = await this.usecase.extractID(token);
    const items = await this.dynamoDBService.getServiceclist(userid);
    
    const tokens:{token:string, api:string}[] = []

    if (items!.length != 0) {
      // 레코드별로 키 이름만 추출해보기
      items.forEach(item => 
        // const keys = Object.keys(item);
        // logger.debug(`이 레코드의 컬럼들: ${keys.join(', ')}`);
        tokens.push({
          token: item.token,
          api: item.sk.replace('service#','')
        })
      );
    }
    
    
    return {
      list: APILIST,
      tokens: tokens
    }
  }

  @Post('/addapi')
  async addingApi(@Body() body: {serviceid:string}, @Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/addapi - adding api token`);
    const token = auth?.replace('Bearer ', '').trim(); // "Bearer " 제거
    const userid = await this.usecase.extractID(token);

    const tokenkey = crypto.randomBytes(32).toString('hex');
    await this.dynamoDBService.requestService(userid, body.serviceid.toString(), tokenkey);


    return {
      token: tokenkey
    }
  }
}

