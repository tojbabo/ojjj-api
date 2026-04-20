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

  async extractID(token: string): Promise<string> {
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
      console.log(error);
      // 토큰 만료, 변조, 기타 에러 시 401 예외 발생
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

}