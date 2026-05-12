import { Body, Controller, Post, Get, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';
import { APILIST }  from '../constants';

import * as crypto from 'crypto';
import { CheckTimeParam } from '../../utils/tools';
import { UserUsecase } from '../application/user.usecase';


// throw new BadRequestException('잘못된 요청')       // 400
// throw new UnauthorizedException('인증 필요')        // 401
// throw new ForbiddenException('권한 없음')           // 403
// throw new NotFoundException('없음')                 // 404
// throw new InternalServerErrorException('서버 오류') // 500


@Controller('api/user')
export class UserController {
  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly authService: AuthUsecase,
    private readonly userService: UserUsecase
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
    const userid = await this.authService.ExtractIDFromToken(auth);
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
    const userid = await this.authService.ExtractIDFromToken(auth);
    const serviceid = body.serviceid.toString()
    const tokenkey = crypto.randomBytes(32).toString('hex');
    await this.dynamoDBService.requestService(userid, serviceid, tokenkey);
    logger.info(`make new api token - ${userid} - ${serviceid}`);

    return {
      token: tokenkey
    }
  }

  @Post('/releaseapi')
  async releaseApi(@Body() body: {serviceid:string}, @Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/releaseapi - release api token`);
    const userid = await this.authService.ExtractIDFromToken(auth);
    const serviceid = body.serviceid.toString()
    const result = await this.dynamoDBService.releaseService(userid, serviceid);
    logger.info(`api remove - ${userid} - ${serviceid} > ${result}`);

    return result;
  }

  @Post('/winprocs')
  async apidata_winprocs(@Body() body: {/*token: string, */stime:string, etime:string, size:number}): Promise<any> {
    logger.info(`api/user/winprocs<post> - test api data`);
    const stime = body.stime; // 202605040000
    const etime = body.etime; // 202605042359
    const size = body.size;
    const token = '78d50b7d32e0532428d77b70c1efa56ebb7a331447870a20af81521906ca4131';
    
    return await this.userService.request_proclist(token, stime, etime, size); 
  }
}
