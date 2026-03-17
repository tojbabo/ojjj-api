import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// logs 폴더 없으면 생성
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
  })
);

export const logger = winston.createLogger({
  level: 'debug', // 최소 레벨 (debug 이상 다 찍힘)
  format,
  transports: [
    // 콘솔 출력
    new winston.transports.Console(),

    // 전체 로그
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'debug',
    }),

    // 에러 로그만 따로
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
  ],
});