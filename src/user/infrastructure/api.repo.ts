import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {logger} from '../../utils/logger';

import * as fs from 'fs';
import * as path from 'path';

interface ApiUsageBuffer {
  [userId: string, serviceId:number]: number; // userId: 요청 횟수
}

@Injectable()
export class ApiRepo implements OnModuleInit, OnModuleDestroy {
  private readonly TEMP_FILE_PATH = path.join(process.cwd(), 'temp', 'api_usage.json');
  private readonly FLUSH_INTERVAL_MS = 10 * 60 * 1000; // 10분

  private buffer: ApiUsageBuffer = {};
  private flushTimer: NodeJS.Timeout | null = null;

  // ----------------------------------------------------------------
  // lifecycle
  // ----------------------------------------------------------------

  onModuleInit() {
    this.recoverFromFile();
    this.startFlushTimer();
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  // ----------------------------------------------------------------
  // public
  // ----------------------------------------------------------------

  /** winprocs 등 api 요청마다 호출 */
  increment(userId: string): void {
    this.buffer[userId] = (this.buffer[userId] ?? 0) + 1;
  }

  /** 특정 유저의 현재 버퍼 카운트 조회 */
  getCount(userId: string): number {
    return this.buffer[userId] ?? 0;
  }

  /** 버퍼 전체 스냅샷 반환 (읽기 전용) */
  getSnapshot(): Readonly<ApiUsageBuffer> {
    return { ...this.buffer };
  }

  // ----------------------------------------------------------------
  // private - 파일
  // ----------------------------------------------------------------

  private ensureTempDir(): void {
    const dir = path.dirname(this.TEMP_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** 버퍼 → 임시 파일 저장 */
  private saveToFile(): void {
    if (Object.keys(this.buffer).length === 0) return;

    try {
      this.ensureTempDir();
      fs.writeFileSync(
        this.TEMP_FILE_PATH,
        JSON.stringify({ savedAt: new Date().toISOString(), data: this.buffer }, null, 2),
        'utf-8',
      );
      logger.info(`임시 파일 저장 완료 (${Object.keys(this.buffer).length}명)`);
    } catch (err) {
      logger.error('임시 파일 저장 실패', err);
    }
  }

  /** 서버 재시작 시 임시 파일 → 버퍼 복구 */
  private recoverFromFile(): void {
    if (!fs.existsSync(this.TEMP_FILE_PATH)) return;

    try {
      const raw = fs.readFileSync(this.TEMP_FILE_PATH, 'utf-8');
      const { savedAt, data } = JSON.parse(raw) as { savedAt: string; data: ApiUsageBuffer };
      this.buffer = data;
      logger.info(`임시 파일 복구 완료 (저장 시각: ${savedAt}, ${Object.keys(data).length}명)`);
    } catch (err) {
      logger.error('임시 파일 복구 실패 — 빈 버퍼로 시작합니다', err);
    }
  }

  /** DB flush 성공 후 호출 — 버퍼 + 파일 정리 */
  clearAfterFlush(): void {
    this.buffer = {};

    if (fs.existsSync(this.TEMP_FILE_PATH)) {
      try {
        fs.unlinkSync(this.TEMP_FILE_PATH);
        logger.info('임시 파일 삭제 완료');
      } catch (err) {
        logger.error('임시 파일 삭제 실패', err);
      }
    }
  }

  // ----------------------------------------------------------------
  // private - 타이머
  // ----------------------------------------------------------------

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.saveToFile();
    }, this.FLUSH_INTERVAL_MS);
  }
}