import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { logger } from '../utils/logger';
import { ServiceUsecase } from '../service/service.usecase';
import { ApiUsecase } from './api.usecase';
import { AuthUsecase } from '../auth/auth.usecase';


// throw new BadRequestException('잘못된 요청')       // 400
// throw new UnauthorizedException('인증 필요')        // 401
// throw new ForbiddenException('권한 없음')           // 403
// throw new NotFoundException('없음')                 // 404
// throw new InternalServerErrorException('서버 오류') // 500


@Controller('api')
export class ApiController {
  constructor(
    private readonly serviceService: ServiceUsecase,
    private readonly apiService: ApiUsecase,
    private readonly authService: AuthUsecase
  ) {}

  /**
   * api service - get window proccess usage list 
   * @param body 
   * @returns 
   */
  @Post('/winprocs')
  async getdata_winprocs(@Body() body: {token: string, stime:string, etime:string, size:number}): Promise<any> {
    logger.info(`api/user/winprocs<post> - get window usage list`);
    const stime = body.stime; // 202605040000
    const etime = body.etime; // 202605042359
    const size = body.size;
    // const token = '78d50b7d32e0532428d77b70c1efa56ebb7a331447870a20af81521906ca4131';
    const token = body.token;

    const {userid, data} = await this.serviceService.getProcList(token, stime, etime, size); 
    await this.apiService.trackRequest(userid, 0);
    return data;
  }

  /**
   * api service - get user usage list
   * @param body 
   * @returns 
   */
  @Post('/usage')
  async getdata_usage(@Body() body: {id:string, pw: string, serviceid:number, stime:string, etime:string, size:number}): Promise<any> {
    logger.info(`api/user/usage<post> - get user use amount`);
    const stime = body.stime; // 202605040000
    const etime = body.etime; // 202605042359
    const size = body.size;
    const servicecid = body.serviceid;
    
    const check = this.authService.verifyUserInfo(body.id, body.pw);
    if(!check) throw new BadRequestException('잘못된 요청') 

    const data = await this.serviceService.getUsageLiset(body.id, servicecid, stime, etime, size); 
    return data;
  }
}
