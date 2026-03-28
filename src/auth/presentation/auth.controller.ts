import { Body, Controller,UnauthorizedException, Post } from '@nestjs/common';
import { AppService } from '../../app.service';
import {DynamoDBService} from '../../dynamodb.service';
import {logger} from '../../utils/logger';



@Controller('api/auth')
export class AuthController {
  constructor(private readonly appService: AppService, private readonly dynamoDBService: DynamoDBService) {}

  @Post('/login')
  async authlogin(@Body() body: {id:string, pw:string}): Promise<number> {
    logger.info(`api/auth/login - try login`);
    const {id, pw} = body;

    const user = await this.dynamoDBService.findUser(id);
    if(user == undefined){
      return 0
    }
    else{
      const isSuccess = await this.appService.compareHash(pw, user['pw'])
      return isSuccess ? 1 : 0; 
    }

  }

  @Post('/join')
  async authjoin(@Body() body: {id:string, pw:string}): Promise<number> {
    logger.info(`api/auth/join`);
    const {id, pw} = body;
    const pwhash = await this.appService.pwHash(pw)
    const isSuccess = await this.dynamoDBService.findUser(id);

    if(!isSuccess){
      await this.dynamoDBService.joinUser(id, pwhash)
      return 1
    }
    else{
      return 0
    }
  }
}

