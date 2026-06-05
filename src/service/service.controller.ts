import { Body, Controller, Post, Get, Headers } from '@nestjs/common';
import {logger} from '../utils/logger';
import { AuthUsecase } from '../auth/auth.usecase';
import { APILIST }  from '../constants';
import { ServiceUsecase } from './service.usecase';


// throw new BadRequestException('잘못된 요청')       // 400
// throw new UnauthorizedException('인증 필요')        // 401
// throw new ForbiddenException('권한 없음')           // 403
// throw new NotFoundException('없음')                 // 404
// throw new InternalServerErrorException('서버 오류') // 500


@Controller('user')
export class ServiceController {
  constructor(
    private readonly authService: AuthUsecase,
    private readonly servService: ServiceUsecase
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
    const tokens = await this.servService.requestApiStates(userid);

    return {
      tokens
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
    const token = await this.servService.requestApiService(userid, serviceid);
    logger.info(`make new api token - ${userid} - ${serviceid}`);


    return {
      token
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
    const result = await this.servService.releaseService(userid, body.serviceid);

    logger.info(`api remove - ${userid} - ${body.serviceid} > ${result}`);

    return result;
  }

  /**
   * 사용자의 월별 사용량 조회
   * @param body 
   * @param auth 
   * @returns 
   */
  @Post('/totalusage')
  async getTotalUsage(@Headers('authorization') auth: string): Promise<any> {
    logger.info(`api/user/totalusage - request total usage`);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const userid = await this.authService.ExtractIDFromToken(auth);
    const usage = await this.servService.getMonthlyUsage(userid, year, month);
    return { usage };
  }

  
}
