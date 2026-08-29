import { Controller, Get, Query } from '@nestjs/common';
import { SecurityService } from './rate-limiter.service';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('rate-limit-check')
  checkLimit(@Query('ip') ip?: string) {
    return this.securityService.checkRateLimit(ip || '127.0.0.1');
  }

  @Get('classify-tier')
  classifyTier(@Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const tier = this.securityService.classifyDataTier(targetDate);
    return {
      date: targetDate,
      tier,
      policy: tier === 'HOT_0_12M' ? 'TimescaleDB Hypertable Active Memory' : tier === 'WARM_12_36M' ? 'Compressed Chunk Storage' : 'S3 / Cold Blob Glacier',
    };
  }
}
