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
  async authlogin(@Body() body: {id:string, pw:string}, @Res({passthrough:true}) res: Response): Promise<any> {
    logger.info(`api/auth/login - try login`);
    const {id, pw} = body;

    const user = await this.dynamoDBService.findUser(id);
    if(user == undefined){
      return 0
    }
    else{
      const isSuccess = await this.appService.compareHash(pw, user['pw'])
      const accesstoken = await this.usecase.makeToken(id, 1);
      const refreshtoken = await this.usecase.makeToken(id, 24*30);
      res.cookie('refreshToken', refreshtoken, {
        httpOnly: true,
        path:"/",
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // domain: "127.0.0.1"
      });

      if(!isSuccess) return 0;
      return {
        accesstoken
      };
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

      const accesstoken = await this.usecase.makeToken(id, 1);
      const refreshtoken = await this.usecase.makeToken(id, 24*30);


      res.cookie('refreshToken', refreshtoken, {
        httpOnly: true,
        path:"/",
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // domain: "127.0.0.1"
      });

      return {
        accesstoken
      };
    }
    else{
      return 0
    }
  }
}

