import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import {DynamoDBService} from './dynamodb.service';
import {logger} from './utils/logger';


class dto{
  'id': string;
  'count': number;
  'data': {time:string, data:any[]}[];
}
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService, private readonly dynamoDBService: DynamoDBService) {}

  @Get('/')
  getHello(): string {
    logger.info("say hello")
    return this.appService.getHello();
  }


  @Post('/windows/set')
  async setWindows(@Body() body: dto): Promise<number> {
    logger.info(`api/windows/set - windows proc log save`);
    const {id, count, data} = body;

    const itemlist: Record<string, any>[] = []
    data.forEach(element => {
      const datatime = Number(element[0]);
      const proclist = element[1];

      if(Number.isNaN(datatime)){
        logger.warn(`acquire Nan datetime`);
        logger.warn(proclist);
      }



      proclist.forEach(p => {
        itemlist.push({
          'process-name':p['name'],
          'time': Number(datatime),
          'id': id,
          'cpu': p['cpu'],
          'memory': p['memory']
        })
      });
    });

    await this.dynamoDBService.putItems(itemlist);

    const isSuccess = true;
    return isSuccess ? 1 : 0;
  }
}
