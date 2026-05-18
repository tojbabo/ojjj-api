import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

@Injectable()
export class AuthUsecase {
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

  async compareHash(pw:string, hash:string): Promise<boolean>{
      return await bcrypt.compare(pw, hash);
  }

  makeToken(id: string, hour:number) {
    const token = jwt.sign(
      { id:id },                 // payload
      process.env.JWT_KEY!,   // secret
      { expiresIn: `${hour}h` }     // optional
    );

    return token;
  }

  async verifyUserInfo(id:string, pw:string): Promise<boolean>{
    let flag = false;
    
    const command = new GetCommand({
      TableName: this.tableName_userinfo,
      Key: {
        id: id,
        sk: 'auth'
      }
    });
    
    const result = await this.client.send(command);
    
    if(result.Item != undefined){
      const user = result.Item;

      const isSuccess = await this.compareHash(pw, user['pw'])
      if(isSuccess) flag = true;
      
    }
    return flag
  }

  async ExtractIDFromToken(auth: string): Promise<string> {
    // const token = auth?.replace('Bearer ', '').trim(); // "Bearer " 제거
    const token = auth.split(" ")[1];
    try {
      // 1. 토큰 검증
      // process.env.JWT_SECRET은 로그인 시 토큰을 생성할 때 사용한 키와 동일해야 합니다.
      const decoded = jwt.verify(token, process.env.JWT_KEY!)! as { id: string };

      // 2. ID 추출 및 반환
      // 토큰 생성 시 { id: '...' } 형태로 넣었다면 decoded.id로 접근합니다.
      if (!decoded.id) {
        throw new Error('Token payload does not contain id');
      }

      return decoded.id;
    } catch (error) {
      console.log('error is : ',error);
      // 토큰 만료, 변조, 기타 에러 시 401 예외 발생
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async verifyToken(token: string):Promise<any>{
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY!);
      return decoded;
    } catch (error:any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('리프레시 토큰이 만료되었습니다. 다시 로그인하세요.');
      }
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }
}