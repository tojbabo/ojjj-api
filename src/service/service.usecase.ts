import { Injectable } from '@nestjs/common';
import { ServiceRepo } from './service.repo';
import * as crypto from 'crypto';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';


@Injectable()
export class ServiceUsecase {
  constructor(
    private readonly servrepo: ServiceRepo
  ){}

  /**
   * 특정 user에 대한 api 서비스 구독 목록을 반환
   * @param userid 
   * @returns 
   */
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

  /**
   * 유저의 api 서비스 구독 신청, 토큰 생성
   * @param userid 
   * @param serviceid 
   * @returns 
   */
  async requestApiService(userid:string, serviceid:string):Promise<string>{
    const tokenkey = crypto.randomBytes(32).toString('hex');
    this.servrepo.requestService(userid, serviceid, tokenkey);
    return tokenkey
  }
  
  /**
   * 유저의 api 서비스 구독 취소, 토큰 반환
   * @param userid 
   * @param serviceid 
   * @returns 
   */
  async releaseService(userid:string, serviceid:string):Promise<boolean>{
    return await this.servrepo.releaseService(userid, serviceid);
  }

  /**
   * 유저의 월간 서비스 사용량을 가져옴
   * @param userId 
   * @param year 
   * @param month 
   * @returns 
   */
  async getMonthlyUsage(userId: string, year: number, month: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const stime = `${year}${pad(month)}010000`;
    const etime = `${year}${pad(month)}310000`;
    return await this.servrepo.getTotalUsage(userId, stime, etime);
  }
}