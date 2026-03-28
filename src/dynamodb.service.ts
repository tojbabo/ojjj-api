// dynamodb.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import {logger} from './utils/logger';

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
export class DynamoDBService {
  private readonly client: DynamoDBDocumentClient;
  private tableName_winproc: string;
  private tableName_userinfo: string;

  constructor(private configService: ConfigService) {
    this.tableName_winproc = this.configService.get<string>("AWS_TABLE_NAME_WINPROCS",'');
    this.tableName_userinfo = this.configService.get<string>("AWS_TABLE_NAME_USERINFO",'');

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

}