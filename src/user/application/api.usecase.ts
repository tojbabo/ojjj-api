import { Injectable } from '@nestjs/common';
import { ApiRepo } from '../infrastructure/api.repo';
 
@Injectable()
export class ApiUsecase {
  constructor(private readonly apiRepo: ApiRepo) {}
 
  trackRequest(userId: string, serviceId: number): void {
    this.apiRepo.increment(userId, serviceId);
  }
 
  getUsageSnapshot() {
    return this.apiRepo.getSnapshot();
  }
}
 