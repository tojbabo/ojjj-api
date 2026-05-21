import { Injectable } from '@nestjs/common';
import { ServiceRepo } from './service.repo';
import * as crypto from 'crypto';


@Injectable()
export class ServiceUsecase {
  constructor(
    private readonly servrepo: ServiceRepo
  ){}

  async requestApiStates(userid:string):Promise<any[]>{
    const items = await this.servrepo.getServiceclist(userid);
    const tokens:{token:string, api:string}[] = []
    
    if (items!.length != 0) {
      // 레코드별로 키 이름만 추출해보기
      items.forEach(item => 
        tokens.push({
          token: item.token,
          api: item.sk.replace('service#','')
        })
      );
    }
    return tokens;

  }

  async requestApiService(userid:string, serviceid:string):Promise<string>{
    const tokenkey = crypto.randomBytes(32).toString('hex');
    this.servrepo.requestService(userid, serviceid, tokenkey);
    return tokenkey
  }

  async releaseService(userid:string, serviceid:string):Promise<boolean>{
    return await this.servrepo.releaseService(userid, serviceid);
  }
}