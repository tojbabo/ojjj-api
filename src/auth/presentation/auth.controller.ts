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
    const pwhash = await this.appService.pwHash(id)
    logger.info(`pas word hash is: ${pwhash}`);

    await this.dynamoDBService.findUser(id);
    
    

    const isSuccess = true;
    return isSuccess ? 1 : 0;
  }
}

