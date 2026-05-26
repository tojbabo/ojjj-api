import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { logger } from './utils/logger';

import * as fs from 'fs';
import * as path from 'path';
import { GetNextTenMin } from './utils/tools';
import { ApiRepo } from './api/api.repo';

interface UsageKey {
  userId: string;
  serviceId: number;
  time:string;
}

export interface UsageRecord extends UsageKey{
  count: number;
}

type UsageBuffer = Map<string, number>;


@Injectable()
export class AppScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly TEMP_FILE_PATH = path.join(process.cwd(), 'temp', 'api_usage.json');
  private readonly INTERVAL_FLUSH = 10 * 60 * 1000; // 10분
  
  private buffer: UsageBuffer = new Map();

  private flushtimer: NodeJS.Timeout | null = null;
  private flushdelay: NodeJS.Timeout | null = null;
  

  constructor(private readonly apiRepo: ApiRepo){}

  onModuleInit() {
    this.startTimer();
  }

  onModuleDestroy() {
    if (this.flushdelay) clearTimeout(this.flushdelay);
    if (this.flushtimer) clearInterval(this.flushtimer);
  }

  /** winprocs 등 api 요청마다 호출 */
  increment(userId: string, serviceId: number): void {
    const key = this.record2String({ userId, serviceId, time: this.getCurrentTime() });
    this.buffer.set(key, (this.buffer.get(key) ?? 0) + 1);
  }

  /** 버퍼 전체 스냅샷 반환 - DB flush 시 사용 */
  getBuffer(): UsageRecord[] {
    return Array.from(this.buffer.entries()).map(([key, count]) => ({
      ...this.str2Record(key),
      count,
    }));
  }
 
  /** DB flush 성공 후 호출 — 버퍼 + 파일 정리 */
  clearBuffer(): void {
    this.buffer.clear();
 
    if (fs.existsSync(this.TEMP_FILE_PATH)) {
      try {
        fs.unlinkSync(this.TEMP_FILE_PATH);
        logger.info('임시 파일 삭제 완료');
      } catch (err) {
        logger.error('임시 파일 삭제 실패', err);
      }
    }
  }

  private startTimer(): void {
    this.flushdelay = setTimeout(() => {
      this.flushToFile(); // 첫 정각에 실행
      if(new Date().getMinutes() === 0 ) {
          this.apiRepo.flushToDB(this.getBuffer());
          this.clearBuffer();
      }
      
      this.flushtimer = setInterval(() => {
        this.flushToFile();
        if(new Date().getMinutes() === 0) {
            this.apiRepo.flushToDB(this.getBuffer());
            this.clearBuffer();
        }
      }, this.INTERVAL_FLUSH); // 이후 10분마다
    }, GetNextTenMin());
  }

  /** 현재 시각을 5분 단위로 내림 ex) 10:07 → "2024-01-15T10:05" */
  private getCurrentTime(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
  
  private record2String({ userId, serviceId, time: slot }: UsageKey): string {
    return `${userId}:${serviceId}:${slot}`;
  }
 
  private str2Record(key: string): UsageKey {
    const [userId, serviceId, slot] = key.split(':');
    return { userId, serviceId: Number(serviceId), time: slot };
  }
 
  private ensureFilePath(): void {
    const dir = path.dirname(this.TEMP_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  ///////////////////////////////////////////
  ///////////////// Public //////////////////
  ///////////////////////////////////////////
  /** 버퍼 → 임시 파일 저장 */
  public async flushToFile(): Promise<void>{
    if (this.buffer.size === 0) return;
 
    try {
      this.ensureFilePath();
      const payload = {
        savedAt: new Date().toISOString(),
        data: Object.fromEntries(this.buffer), // Map → plain object
      };
      fs.writeFileSync(this.TEMP_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
      logger.info(`임시 파일 저장 완료 (${this.buffer.size}건)`);
    } catch (err) {
      logger.error('임시 파일 저장 실패', err);
    }
  }
 
  /** 임시 파일을 읽어서 buffer에 저장 */
  public recoverFromFile(): void {
    if (!fs.existsSync(this.TEMP_FILE_PATH)) return;
 
    try {
      const raw = fs.readFileSync(this.TEMP_FILE_PATH, 'utf-8');
      const { savedAt, data } = JSON.parse(raw) as { savedAt: string; data: Record<string, number> };
      this.buffer = new Map(Object.entries(data));
      logger.info(`임시 파일 복구 완료 (저장 시각: ${savedAt}, ${this.buffer.size}건)`);
    } catch (err) {
      logger.error('임시 파일 복구 실패 — 빈 버퍼로 시작합니다', err);
    }
  }
}