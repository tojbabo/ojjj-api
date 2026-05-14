import { Body, Controller, Post, Get, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import {logger} from '../../utils/logger';
import { AuthUsecase } from '../application/login.usecase';
import { APILIST }  from '../constants';

import * as crypto from 'crypto';
import { UserUsecase } from '../application/user.usecase';
import { DynamoDBRepo } from '../../dynamodb.repo';


// throw new BadRequestException('잘못된 요청')       // 400
// throw new UnauthorizedException('인증 필요')        // 401
// throw new ForbiddenException('권한 없음')           // 403
// throw new NotFoundException('없음')                 // 404
// throw new InternalServerErrorException('서버 오류') // 500


@Controller('api/user/api')
export class ApiController {
  constructor(
    private readonly dbrepo: DynamoDBRepo,
    private readonly authService: AuthUsecase,
    private readonly userService: UserUsecase
  ) {}
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
