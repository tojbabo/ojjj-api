// dynamodb.repo.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {logger} from '../utils/logger';

// id, sk , pw, time, token
// tt@nav, [auth, service#0], '' , 260404-2356 , '423423423'

function getTime() {
  const d = new Date();

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  return `${yy}${mm}${dd}-${hh}${mi}`;
}

@Injectable()
export class ServiceRepo {
  private readonly client: DynamoDBDocumentClient;
  private tableName_winproc: string;
  private tableName_userinfo: string;
  private tableName_usage: string;

  constructor(private configService: ConfigService) {
    this.tableName_winproc = this.configService.get<string>("AWS_TABLE_NAME_WINPROCS",'');
    this.tableName_userinfo = this.configService.get<string>("AWS_TABLE_NAME_USERINFO",'');
    this.tableName_usage = this.configService.get<string>("AWS_TABLE_NAME_USERUSAGE",'');

    const dynamoClient = new DynamoDBClient({
        region: this.configService.get<string>("AWS_REGION",''),
        credentials: {
            accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID",''),
            secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY",'')
        }
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  /**
   * 사용자가 구독한 모든 api 토큰 목록을 가져옴
   * @param id 
   * @returns 
   */
  async getServiceclist(id: string){
    const command = new QueryCommand({
      TableName: this.tableName_userinfo,
      KeyConditionExpression: "id = :id AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":id": id,
        ":prefix": "service#"
      },
    });
    
    const result = await this.client.send(command);
    
    return result.Items || []
  }

  /**
   * 사용자의 해당 서비스에 대한 토큰을 저장
   * @param userid 
   * @param serviceid 
   * @param tokenKey 
   * @returns 
   */
  async requestService(userid: string, serviceid: string, tokenKey: string){
    const command = new PutCommand({
      TableName: this.tableName_userinfo,
      Item: {
          id: userid,
          sk: 'service#'+serviceid,
          token: tokenKey,
          time:getTime()
        },
    });
    return await this.client.send(command);

  }

  /**
   * 사용자의 특정 api 토큰을 삭제
   * @param userid 
   * @param serviceid 
   * @returns 
   */
  async releaseService(userid: string, serviceid: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName_userinfo,
      Key: {
        id: userid,
        sk: 'service#' + serviceid,
      },
    }); 
    try{
      await this.client.send(command);
      return true;

    }catch(err){
      logger.debug('delete error - '+err);
      return false;
    }
  }

  /**
   * start time ~ end time 구간의 size 갯수 만큼의 프로세스 사용량 목록을 가져옴
   * @param stime 
   * @param etime 
   * @param size 
   * @returns 
   */
  async selectRangeProcs(stime:number, etime:number, size:number):Promise<object[]>{
    const command = new ScanCommand({
      TableName: this.tableName_winproc,
      FilterExpression: '#sk BETWEEN :startTime and :endTime',
      ExpressionAttributeNames:{
        '#sk': 'time',
      },
      ExpressionAttributeValues:{
      ':startTime': stime,
      ':endTime': etime,
      }
    });
    const result = await this.client.send(command);
    const items = result.Items ?? [];

    // process-name 별로 그룹화
    const grouped = items.reduce((acc, item) => {
      const key = item['process-name'];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    // 그룹별 최신순 정렬 후 N개 제한
    const result2 = Object.entries(grouped).map(([processName, groupItems]) => ({
      "pname": processName,
      "data": groupItems
        .sort((a, b) => b.time - a.time)  // 내림차순 (최신이 앞으로)
        .slice(0, size)
        .map((item) => ({
          process: item['process-name'],
          mem: item.memory,
          time:item.time,
          id: item.id,
          cpu: item.cpu
        })),
    }));

    return result2;
  }

  /**
   * 사용자의 서비스 총 이용량 조회
   * @param userId 
   * @param stime 
   * @param etime 
   * @returns 
   */
  async getTotalUsage(userId: string, stime: string, etime: string):Promise<object[]>{
    const command = new QueryCommand({
      TableName: 'usage-api-service',
      KeyConditionExpression: 'id = :userId AND sk BETWEEN :stime AND :etime',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':stime': stime,
        ':etime': etime,
      },
    });

    const result = await this.client.send(command);

    // serviceId별로 그룹핑 + 합산
    const grouped = (result.Items ?? []).reduce<Record<string, number>>((acc, item) => {
      const serviceId = item.sk.split(':')[1]; // sk에서 serviceId 추출
      acc[serviceId] = (acc[serviceId] ?? 0) + item.count;
      return acc;
    }, {});

    // 리스트로 변환
    return Object.entries(grouped).map(([serviceId, count]) => ({
      serviceId: Number(serviceId),
      count,
    }));

  }

  /**
   * 사용자의 서비스에 대한 사용 목록을 가져옴
   * @param id 
   * @param service 
   * @param stime 
   * @param etime 
   * @param size 
   * @returns 
   */
  async selectRangeUsage(id: string, service:number, stime:number, etime:number, size:number):Promise<object[]>{
    const command = new QueryCommand({
      TableName: this.tableName_usage,
      KeyConditionExpression:
        'id = :userId AND sk BETWEEN :stime AND :etime',
      FilterExpression: 'serviceId = :serviceId',
      ExpressionAttributeValues: {
        ':userId': id,
        ':stime': `${stime}:${service}`,
        ':etime': `${etime}:${service}`,
        ':serviceId': service,
      },
    });

    const result = await this.client.send(command);
    return result.Items ?? [];
  }

  /**
   * 토큰이 해당 서비스에서 발급이 됐는지 확인, 발급이 된 경우 소유한 사용자의 ID를 반환
   * @param serviceid 
   * @param token 
   * @returns 해당 토큰의 소유자ID
   */
  async CheckServiceToken(serviceid:number, token:string):Promise<string|undefined>{
    const command = new QueryCommand({
      TableName: this.tableName_userinfo,
      IndexName: 'with-token-index',

      KeyConditionExpression: 'sk = :sk AND #token = :token',
      ExpressionAttributeNames: {
        '#token': 'token',
      },

      ExpressionAttributeValues: {
        ':sk' : `service#${serviceid}`,
        ':token' : token,
      },
      Limit: 1,
    });

    const result = await this.client.send(command);
    return result.Items?.[0]['id'];
  }
}
