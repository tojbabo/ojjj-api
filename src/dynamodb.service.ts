// dynamodb.service.ts
import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import {logger} from './utils/logger';

const tableName = 'windows-usage-data'

@Injectable()
export class DynamoDBService {
  private readonly client: DynamoDBDocumentClient;

  constructor() {
    const dynamoClient = new DynamoDBClient({
        region: 'ap-southeast-2',
        credentials: {
            accessKeyId: 'AKIA3HBIPAUZDG2TRR4Y',
            secretAccessKey: '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'
        }
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  async putItem(item: Record<string, any>) {
    const command = new PutCommand({
      TableName: tableName,
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
              [tableName]: putRequests,
            }
          })
        )
      })
    )
  }
}