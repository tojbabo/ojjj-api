// dynamodb.repo.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {logger} from './utils/logger';

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
export class DynamoDBRepo {
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

  async putItem(item: Record<string, any>) {
    const command = new PutCommand({
      TableName: this.tableName_winproc,
      Item: item,
    });
    return await this.client.send(command);
  }

  async putItems(items: Record<string, any>[]){
    logger.info(`aws.dynamoDB - data save ${items.length}`);
    const chunksize = 25;
    const chunks: Record<string, any>[] = [];

    for (let i = 0 ; i< items.length; i+= chunksize){
      chunks.push(items.slice(i, i+ chunksize));
    }
    await Promise.all(
      chunks.map((chunk)=>{
        const putRequests = chunk.map((item)=>({
          PutRequest: {Item: item},
        }));
        return this.client.send(
          new BatchWriteCommand({
            RequestItems:{
              [this.tableName_winproc]: putRequests,
            }
          })
        )
      })
    )
  }

  async joinUser(id:string, pw:string){
    const command = new PutCommand({
      TableName: this.tableName_userinfo,
      Item: {
          'id':id,
          'sk': 'auth',
          'pw': pw,
          'time':getTime()
        },
    });
    return await this.client.send(command);
    
  }

  async findUser(id: string){
    const command = new GetCommand({
      TableName: this.tableName_userinfo,
      Key: {
        id: id,
        sk: 'auth'
      }
    });
    
    const result = await this.client.send(command);
    
    if(result.Item == undefined) return false
    else return result.Item
  }

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

  async releaseService(userid: string, serviceid: string): Promise<Boolean> {
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

  async selectRangeUsage(id: string, service:number, stime:number, etime:number, size:number):Promise<object[]>{
    const command = new QueryCommand({
      TableName: this.tableName_usage,
      KeyConditionExpression:
        'userId = :userId AND sk BETWEEN :stime AND :etime',
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
