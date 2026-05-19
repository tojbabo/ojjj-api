import { Body, Controller, Post, Get, Headers } from '@nestjs/common';
import {logger} from '../utils/logger';
import { AuthUsecase } from '../auth/auth.usecase';
import { APILIST }  from '../constants';

import * as crypto from 'crypto';
import { DynamoDBRepo } from '../dynamodb.repo';


// throw new BadRequestException('잘못된 요청')       // 400
// throw new UnauthorizedException('인증 필요')        // 401
// throw new ForbiddenException('권한 없음')           // 403
// throw new NotFoundException('없음')                 // 404
// throw new InternalServerErrorException('서버 오류') // 500


@Controller('user')
export class ServiceController {
  constructor(
    private readonly dbrepo: DynamoDBRepo,
    private readonly authService: AuthUsecase,
  ) {}

  /**
   * API List 요청
   * @returns 
   */
  @Get('/apilist')
  async reqApiList(): Promise<any> {
    logger.info(`api/user/apilist - request api list`);

    return {
      list: APILIST
    }
  }

  /**
   * 사용자의 APi Serivce 토큰 리스트 요청
   * @param auth 
   * @returns 
   */
  @Post('/apilist')
  async reqApiList_post(@Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/applist<post> - request api list`);
    const userid = await this.authService.ExtractIDFromToken(auth);
    const items = await this.dbrepo.getServiceclist(userid);
    
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
      tokens: tokens
    }
  }

  /**
   * 특정 api service에 대해서 토큰 발행
   * @param body 
   * @param auth 
   * @returns 
   */
  @Post('/addapi')
  async addingApi(@Body() body: {serviceid:string}, @Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/addapi - adding api token`);
    const userid = await this.authService.ExtractIDFromToken(auth);
    const serviceid = body.serviceid.toString()
    const tokenkey = crypto.randomBytes(32).toString('hex');
    await this.dbrepo.requestService(userid, serviceid, tokenkey);
    logger.info(`make new api token - ${userid} - ${serviceid}`);

    return {
      token: tokenkey
    }
  }

  /**
   * 특정 api service에 대해서 토큰 해지
   * @param body 
   * @param auth 
   * @returns 
   */
  @Post('/releaseapi')
  async releaseApi(@Body() body: {serviceid:string}, @Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/releaseapi - release api token`);
    const userid = await this.authService.ExtractIDFromToken(auth);
    const serviceid = body.serviceid.toString()
    const result = await this.dbrepo.releaseService(userid, serviceid);
    logger.info(`api remove - ${userid} - ${serviceid} > ${result}`);

    return result;
  }

  
}
