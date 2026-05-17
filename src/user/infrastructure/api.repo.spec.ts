// api.repo.spec.ts
import { Test } from '@nestjs/testing';
import { ApiRepo } from './api.repo';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('ApiRepo', () => {
  let repo: ApiRepo;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [ApiRepo],
    }).compile();

    repo = module.get(ApiRepo);
    repo.onModuleInit(); // 파일 복구 + 타이머 시작
  });

  afterEach(() => {
    repo.onModuleDestroy(); // 타이머 정리
  });

  it('increment 후 snapshot 확인', () => {
    repo.increment('user1', 1);
    repo.increment('user1', 1);
    repo.increment('user2', 2);

    const snapshot = repo.getSnapshot();

    expect(snapshot.find(r => r.userId === 'user1')?.count).toBe(2);
    expect(snapshot.find(r => r.userId === 'user2')?.count).toBe(1);
  });

  it('파일 저장 확인', async () => {
    repo.increment('user1', 1);
    await repo.saveToFile(); // private → public 임시 변경 필요

    // temp/api_usage.json 생성됐는지 확인
    const fs = require('fs');
    expect(fs.existsSync('temp/api_usage.json')).toBe(true);
  });

  it('DB flush 확인', async () => {
    repo.increment('user1', 1);
    repo.increment('user2', 2);

    await repo.flushToDb(); // private → public 임시 변경 필요
    // DynamoDB 실제 호출됨 — AWS 콘솔에서 확인
  });
});