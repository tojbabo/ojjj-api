import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';

export class AuthUsecase {
  constructor(){}

  makeToken(id: string, hour:number) {
    const token = jwt.sign(
      { id:id },                 // payload
      process.env.JWT_KEY!,   // secret
      { expiresIn: `${hour}h` }     // optional
    );

    return token;
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