import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ServiceUsecase } from './service.usecase';
import { ServiceRepo } from './service.repo';

describe('ApiUsecase', () => {
  let usecase: ServiceUsecase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [ServiceUsecase, ServiceRepo],
    }).compile();

    usecase = module.get<ServiceUsecase>(ServiceUsecase);
  });

  it('월별 사용량 조회', async () => {
    const result = await usecase.getMonthlyUsage('user1', 2026, 5);
    console.log('결과:', result);
    expect(result.length).toBeGreaterThan(0);
  });
});