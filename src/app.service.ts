import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const saltRounds = 12;


@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  
  async pwHash(pw:string): Promise<string>{
    const hash = await bcrypt.hash(pw, saltRounds);
    // const isMatch = await bcrypt.compare(pw, hash);
    return hash;
  }
}

