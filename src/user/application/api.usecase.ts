import { Injectable } from '@nestjs/common';
import { ApiRepo } from '../infrastructure/api.repo';
 
@Injectable()
export class ApiUsecase {
  constructor(private readonly apiRepo: ApiRepo) {}

  onModuleInit(){
    this.apiRepo.recoverFromFile();


  }
 
  trackRequest(userId: string, serviceId: number): void {
    this.apiRepo.increment(userId, serviceId);
  }
 
  getUsageSnapshot() {
    return this.apiRepo.getBuffer();
  }
}
 