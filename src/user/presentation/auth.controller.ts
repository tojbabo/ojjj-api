import { Body, Controller, Post, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AppService } from '../../app.service';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';
import { UnauthorizedException } from '@nestjs/common';



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
      if(!isSuccess) return 0;

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
  }

  @Post('/logout')
  async logout(@Res({ passthrough: true }) res: Response): Promise<any> {
    logger.info(`api/auth/logout - user logout`);

    res.cookie('refreshToken', '', {
      httpOnly: true,
      path: "/",
      expires: new Date(0), 
      maxAge: 0,            
      secure: false, 
      sameSite: 'lax',
    });

    return {
      success: true,
      message: 'Logged out successfully'
    };
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

  
  @Post('/refresh')
  async authcheck(@Req() req: Request): Promise<any> {
    logger.info(`api/auth/refresh - request access token`);

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }

    try {
      const decoded = await this.usecase.verifyToken(refreshToken);
      const userId = decoded.id;
      const accesstoken = await this.usecase.makeToken(userId, 1);
      return {
        accesstoken
      };
    } catch (error) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다. 다시 로그인해주세요.');
    }
  }


}

