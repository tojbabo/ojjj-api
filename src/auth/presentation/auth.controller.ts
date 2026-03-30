import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from '../../app.service';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';



@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly appService: AppService, 
    private readonly dynamoDBService: DynamoDBService,
    private readonly usecase: AuthUsecase
  ) {}

  @Post('/login')
  async authlogin(@Body() body: {id:string, pw:string}): Promise<number> {
    logger.info(`api/auth/login - try login`);
    const {id, pw} = body;

    const user = await this.dynamoDBService.findUser(id);
    if(user == undefined){
      return 0
    }
    else{
      const isSuccess = await this.appService.compareHash(pw, user['pw'])
      return isSuccess ? 1 : 0; 
    }

  }

  @Post('/join')
  async authjoin(@Body() body: {id:string, pw:string}, @Res({passthrough:true}) res: Response): Promise<any> {
    logger.info(`api/auth/join`);
    const {id, pw} = body;
    const pwhash = await this.appService.pwHash(pw)
    const isSuccess = await this.dynamoDBService.findUser(id);

    if(!isSuccess){
      await this.dynamoDBService.joinUser(id, pwhash)

      const shorttoken = await this.usecase.makeToken(id, 1);
      const longtoken = await this.usecase.makeToken(id, 24*30);


      res.cookie('refreshToken', longtoken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return {
        shorttoken
      };
    }
    else{
      return 0
    }
  }
}

