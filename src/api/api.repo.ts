import { Injectable } from '@nestjs/common';
import {logger} from '../utils/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';
import { UsageRecord } from '../app.scheduler';

@Injectable()
export class ApiRepo {
  private readonly TABLE:string;
  private readonly TABLE_WINPROCS:string;
  private readonly DBCLIENT: DynamoDBDocumentClient;

  constructor(private configService: ConfigService){
    this.TABLE_WINPROCS = this.configService.get<string>("AWS_TABLE_NAME_WINPROCS",'');
    this.TABLE = this.configService.get<string>("AWS_TABLE_NAME_USERUSAGE",'');
    const dynamoClient = new DynamoDBClient({
        region: this.configService.get<string>("AWS_REGION",''),
        credentials: {
            accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID",''),
            secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY",'')
        }
    });
    this.DBCLIENT = DynamoDBDocumentClient.from(dynamoClient);
  }

  /**
   * save data to Database
   * @returns 
   */
  public async flushToDB(snapshot:UsageRecord[]): Promise<boolean> {
    if (snapshot.length === 0) return false;

    try {
      await Promise.all(snapshot.map((r) => this.upsertRecord(r)));
      
      logger.info(`DB flush 완료 (${snapshot.length}건)`);
      return true;
    } catch (err) {
      logger.error('DB flush 실패 — 다음 주기에 재시도합니다', err);
      return false
    }
  }

  private async upsertRecord(record: UsageRecord): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.TABLE,
      Key: {
        id: record.userId,
        sk: `${record.time}:${record.serviceId}`,
      },
      UpdateExpression: 'ADD #count :count',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':count': record.count },
    });
    await this.DBCLIENT.send(command);
  }

  async selectRangeProcs(stime:number, etime:number, size:number):Promise<object[]>{
    const command = new ScanCommand({
      TableName: this.TABLE_WINPROCS,
      FilterExpression: '#sk BETWEEN :startTime and :endTime',
      ExpressionAttributeNames:{
        '#sk': 'time',
      },
      ExpressionAttributeValues:{
      ':startTime': stime,
      ':endTime': etime,
      }
    });
    const result = await this.DBCLIENT.send(command);
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

  async selectRangeUsage(id: string, service:number, stime:string, etime:string, size:number):Promise<object[]>{
    const command = new QueryCommand({
      TableName: this.TABLE,
      KeyConditionExpression: 'id = :userId AND sk BETWEEN :stime AND :etime',
      ExpressionAttributeValues: {
        ':userId': id,
        ':stime': `${stime}:${service}`,
        ':etime': `${etime}:${service}`,
      },
      // Limit: size,
      ScanIndexForward: false, // 최신순 정렬
    });

    const result = await this.DBCLIENT.send(command);
    return result.Items ?? [];
  }
}