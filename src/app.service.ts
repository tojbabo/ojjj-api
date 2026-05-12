import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DynamoDBRepo } from './dynamodb.repo';
import { logger } from './utils/logger';

const saltRounds = 12;


@Injectable()
export class AppService {
  constructor(private readonly dbrepo: DynamoDBRepo){}
  getHello(): string {
    return 'Hello World!';
  }
  
  async pwHash(pw:string): Promise<string>{
    return await bcrypt.hash(pw, saltRounds);
  }

  async compareHash(pw:string, hash:string): Promise<boolean>{
    return await bcrypt.compare(pw, hash);
  }

  async SavingProcsLog(body:any): Promise<number>{
    const {id, count, data} = body;
    
    const itemlist: Record<string, any>[] = []
    data.forEach(element => {
      const datatime = Number(element[0]);
      const proclist = element[1];

      if(Number.isNaN(datatime)){
        logger.warn(`wrong data - datatime[${datatime}]`);
      }
      else{
        proclist.forEach(p => {
          itemlist.push({
            'process-name':p['name'],
            'time': Number(datatime),
            'id': id,
            'cpu': p['cpu'],
            'memory': p['memory']
          })
        });
      }
    });
    await this.dbrepo.putItems(itemlist);
    return 1;
  }

}

