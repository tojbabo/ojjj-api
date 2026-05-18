import { Body, Controller, Post, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AppService } from '../app.service';
import {logger} from '../utils/logger';
import { AuthUsecase } from './login.usecase';
import { UnauthorizedException } from '@nestjs/common';
import { DynamoDBRepo } from '../dynamodb.repo';



@Controller('auth')
export class AuthController {
  constructor(
    private readonly appService: AppService, 
    private readonly dbrepo: DynamoDBRepo,
    private readonly usecase: AuthUsecase
  ) {}

  /**
   * 로그인 요청
   * @param body 
   * @param res 
   * @returns 
   */
  @Post('/login')
  async authlogin(@Body() body: {id:string, pw:string}, @Res({passthrough:true}) res: Response): Promise<any> {
    logger.info(`api/auth/login - try login`);
    const {id, pw} = body;

    const user = await this.dbrepo.findUser(id);
    if(user == undefined){
      return 0
    }
    else{
      const isSuccess = await this.appService.compareHash(pw, user['pw'])
      if(!isSuccess) return 0;

      const accessToken = await this.usecase.makeToken(id, 1);
      const refreshToken = await this.usecase.makeToken(id, 24*30);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        path:"/",
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // domain: "127.0.0.1"
      });
      return {
        accessToken
      };
    }
  }

  /**
   * 로그아웃 요청
   * @param res 
   * @returns 
   */
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

  /**
   * 회원가입 요청
   * @param body 
   * @param res 
   * @returns 
   */
  @Post('/join')
  async authjoin(@Body() body: {id:string, pw:string}, @Res({passthrough:true}) res: Response): Promise<any> {
    logger.info(`api/auth/join`);
    const {id, pw} = body;
    const pwhash = await this.appService.pwHash(pw)
    const isSuccess = await this.dbrepo.findUser(id);

    if(!isSuccess){
      await this.dbrepo.joinUser(id, pwhash)

      const accessToken = await this.usecase.makeToken(id, 1);
      const refreshToken = await this.usecase.makeToken(id, 24*30);


      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        path:"/",
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // domain: "127.0.0.1"
      });

      return {
        accessToken
      };
    }
    else{
      return 0
    }
  }

  /**
   * get accessToken with refreshToken
   * @param req 
   * @returns 
   */
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
      const accessToken = await this.usecase.makeToken(userId, 1);
      return {
        accessToken
      };
    } catch (error) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다. 다시 로그인해주세요.');
    }
  }
}

