import * as jwt from 'jsonwebtoken';

export class AuthUsecase {
  constructor(){}

  makeToken(id: string, hour:number) {
    const token = jwt.sign(
      { id },                 // payload
      process.env.JWT_KEY!,   // secret
      { expiresIn: `${hour}h` }     // optional
    );

    return token;
  }
}