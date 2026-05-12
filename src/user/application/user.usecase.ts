import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DynamoDBRepo } from '../../dynamodb.repo';
import { CheckTimeParam } from '../../utils/tools';




@Injectable()
export class UserUsecase {
  constructor(private readonly dbrepo: DynamoDBRepo){}
  async request_proclist(token:string, stime:string, etime:string, size:number): Promise<any>{
    if(!(CheckTimeParam(stime) && CheckTimeParam(etime)) ){
        throw new BadRequestException("잘못된 요청");
    }
    else if(!(await this.dbrepo.CheckServiceToken(0,token))){
      throw new UnauthorizedException('잘못된 토큰')

    }

    const data = await this.dbrepo.selectRangeProcs(Number.parseInt(stime), Number.parseInt(etime), size);
    return data;
  }
  
}