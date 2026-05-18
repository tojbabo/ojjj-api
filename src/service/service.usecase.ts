import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DynamoDBRepo } from '../dynamodb.repo';
import { CheckTimeParam } from '../utils/tools';




@Injectable()
export class ServiceUsecase {
  constructor(private readonly dbrepo: DynamoDBRepo){}
  async getProcList(token:string, stime:string, etime:string, size:number): Promise<{userid:string, data:any}>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }

    const userid = await this.dbrepo.CheckServiceToken(0,token)

    if(userid == undefined){
      throw new UnauthorizedException('잘못된 토큰')
    }

    const data = await this.dbrepo.selectRangeProcs(Number.parseInt(stime), Number.parseInt(etime), size);
    return {userid, data};
  }

  async getUsageLiset(id:string,servicecid:number, stime:string, etime:string, size:number): Promise<any>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }
    const data = await this.dbrepo.selectRangeUsage(id, servicecid, Number.parseInt(stime), Number.parseInt(etime), size);
    return data;

  }
  
}