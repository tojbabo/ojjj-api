import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const saltRounds = 12;


@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  
  async pwHash(pw:string): Promise<string>{
    return await bcrypt.hash(pw, saltRounds);
  }

  async compareHash(pw:string, hash:string): Promise<boolean>{
    return await bcrypt.compare(pw, hash);
  }

}

