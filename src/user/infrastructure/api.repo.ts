import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {logger} from '../../utils/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

interface UsageKey {
  userId: string;
  serviceId: number;
  slot:string;
}

export interface UsageRecord extends UsageKey{
  count: number;
}

type UsageBuffer = Map<string, number>;


@Injectable()
export class ApiRepo implements OnModuleInit, OnModuleDestroy {
  private readonly TEMP_FILE_PATH = path.join(process.cwd(), 'temp', 'api_usage.json');
  private readonly FLUSH_INTERVAL_MS = 10 * 60 * 1000; // 10분
  private readonly TABLE_NAME = 'usage-api-service';
  private readonly DB_FLUSH_INTERVAL_MS = 60 * 60 * 1000; // 1시간
  private readonly client: DynamoDBDocumentClient;
  private dbFlushTimer: NodeJS.Timeout | null = null;

  private buffer: UsageBuffer = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  // ----------------------------------------------------------------
  // lifecycle
  // ----------------------------------------------------------------

  constructor(private configService: ConfigService){
    const dynamoClient = new DynamoDBClient({
        region: this.configService.get<string>("AWS_REGION",''),
        credentials: {
            accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID",''),
            secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY",'')
        }
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  onModuleInit() {
    // this.recoverFromFile();
    this.startFlushTimer();
    this.startDbFlushTimer(); // 추가
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.dbFlushTimer) clearInterval(this.dbFlushTimer); // 추가
  }

  // ----------------------------------------------------------------
  // public
  // ----------------------------------------------------------------

  /** winprocs 등 api 요청마다 호출 */
 increment(userId: string, serviceId: number): void {
    const key = this.buildKey({ userId, serviceId, slot: this.getCurrentSlot() });
    this.buffer.set(key, (this.buffer.get(key) ?? 0) + 1);
  }
 
  /** 버퍼 전체 스냅샷 반환 - DB flush 시 사용 */
  getSnapshot(): UsageRecord[] {
    return Array.from(this.buffer.entries()).map(([key, count]) => ({
      ...this.parseKey(key),
      count,
    }));
  }
 
  /** DB flush 성공 후 호출 — 버퍼 + 파일 정리 */
  clearAfterFlush(): void {
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
 
  // ----------------------------------------------------------------
  // private - 5분 슬롯
  // ----------------------------------------------------------------
 
  /** 현재 시각을 5분 단위로 내림 ex) 10:07 → "2024-01-15T10:05" */
  private getCurrentSlot(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
 
  // ----------------------------------------------------------------
  // private - 키 직렬화
  // ----------------------------------------------------------------
 
  private buildKey({ userId, serviceId, slot }: UsageKey): string {
    return `${userId}:${serviceId}:${slot}`;
  }
 
  private parseKey(key: string): UsageKey {
    const [userId, serviceId, slot] = key.split(':');
    return { userId, serviceId: Number(serviceId), slot };
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
  public async saveToFile(): Promise<void>{
    if (this.buffer.size === 0) return;
 
    try {
      this.ensureTempDir();
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
 
  
  /**
   * 임시 파일을 읽어서 buffer에 저장
   */
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
 
  // ----------------------------------------------------------------
  // private - 타이머
  // ----------------------------------------------------------------
 
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.saveToFile();
    }, this.FLUSH_INTERVAL_MS);
  }


  /**
   * save data to Database
   * @returns 
   */
  public async flushToDb(): Promise<void> {
  const snapshot = this.getSnapshot();
  if (snapshot.length === 0) return;

    try {
      await Promise.all(snapshot.map((r) => this.upsertRecord(r)));
      this.clearAfterFlush();
      logger.info(`DB flush 완료 (${snapshot.length}건)`);
    } catch (err) {
      logger.error('DB flush 실패 — 다음 주기에 재시도합니다', err);
    }
  }

  private async upsertRecord(record: UsageRecord): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.TABLE_NAME,
      Key: {
        id: record.userId,
        sk: `${record.slot}:${record.serviceId}`,
      },
      UpdateExpression: 'ADD #count :count',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':count': record.count },
    });
    await this.client.send(command);
  }

  private startDbFlushTimer(): void {
    this.dbFlushTimer = setInterval(() => {
      void this.flushToDb();
    }, this.DB_FLUSH_INTERVAL_MS);
  }
}