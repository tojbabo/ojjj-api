import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiRepo } from './api.repo';
import { CheckTimeParam } from '../utils/tools';
import { APILIST } from '../constants';
import { ServiceRepo } from '../service/service.repo';
import { AppScheduler, UsageRecord } from '../app.scheduler';
 
@Injectable()
export class ApiUsecase {
  constructor(
    private readonly scheduler: AppScheduler,
    private readonly apiRepo: ApiRepo,
    private readonly servRepo: ServiceRepo,
  ) {}

  onModuleInit(){
    this.scheduler.recoverFromFile();
  }

  /**
   * windows 프로세스 사용량 리스트 반환
   * @param token 
   * @param stime 
   * @param etime 
   * @param size 
   * @returns 
   */
  async getProcList(token:string, stime:string, etime:string, size:number): Promise<{userid:string, data:any}>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }

    const userid = await this.servRepo.CheckServiceToken(APILIST.WINPROCS.id,token)

    if(userid == undefined){
      throw new UnauthorizedException('잘못된 토큰')
    }

    const data = await this.apiRepo.selectRangeProcs(Number.parseInt(stime), Number.parseInt(etime), size);
    return {userid, data};
  }

  /**
   * 사용자 api 서비스 사용량 리스트 반환
   * @param id 
   * @param servicecid 
   * @param stime 
   * @param etime 
   * @param size 
   * @returns 
   */
  async getUsageLiset(id:string,servicecid:number, stime:string, etime:string, size:number): Promise<any>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }
    const data = await this.apiRepo.selectRangeUsage(id, servicecid, Number.parseInt(stime), Number.parseInt(etime), size);
    return data;
  }
 
  /**
   * 사용자의 api 서비스 사용량 카운팅
   * @param userId 
   * @param serviceId 
   */
  trackRequest(userId: string, serviceId: number): void {
    this.scheduler.increment(userId, serviceId);
  }
 
  /**
   * 사용자의 api 서비스 사용량 가져오기
   * @returns 
   */
  getUsageSnapshot():UsageRecord[] {
    return this.scheduler.getBuffer();
  }


}
 