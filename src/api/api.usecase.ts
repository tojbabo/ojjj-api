import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiRepo, UsageRecord } from './api.repo';
import { CheckTimeParam } from '../utils/tools';
import { DynamoDBRepo } from '../dynamodb.repo';
import { APILIST } from '../constants';
 
@Injectable()
export class ApiUsecase {
  constructor(
    private readonly apiRepo: ApiRepo,
    private readonly dbrepo: DynamoDBRepo
  ) {}

  onModuleInit(){
    this.apiRepo.recoverFromFile();
  }

  async getProcList(token:string, stime:string, etime:string, size:number): Promise<{userid:string, data:any}>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }

    const userid = await this.dbrepo.CheckServiceToken(APILIST.WINPROCS.id,token)

    if(userid == undefined){
      throw new UnauthorizedException('잘못된 토큰')
    }

    const data = await this.apiRepo.selectRangeProcs(Number.parseInt(stime), Number.parseInt(etime), size);
    return {userid, data};
  }

  async getUsageLiset(id:string,servicecid:number, stime:string, etime:string, size:number): Promise<any>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }
    const data = await this.apiRepo.selectRangeUsage(id, servicecid, Number.parseInt(stime), Number.parseInt(etime), size);
    return data;
  }
 
  trackRequest(userId: string, serviceId: number): void {
    this.apiRepo.increment(userId, serviceId);
  }
 
  getUsageSnapshot():UsageRecord[] {
    return this.apiRepo.getBuffer();
  }


}
 