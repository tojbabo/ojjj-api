// dynamodb.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import {logger} from './utils/logger';

@Injectable()
export class DynamoDBService {
  private readonly client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(private configService: ConfigService) {
    this.tableName = this.configService.get<string>("AWS_TABLE_NAME_WINPROCS",'');

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
      TableName: this.tableName,
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
              [this.tableName]: putRequests,
            }
          })
        )
      })
    )
  }
}