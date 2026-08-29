import { Controller, Get, Query } from '@nestjs/common';
import { SonziService, RiskProfile } from './sonzi.service';

@Controller('sonzi')
export class SonziController {
  constructor(private readonly sonziService: SonziService) {}

  @Get('health')
  getHealthMetrics(@Query('riskProfile') riskProfile?: RiskProfile) {
    return this.sonziService.calculateHealthMetrics(
      35000000,
      5200000,
      12000000,
      260500000,
      1600000000,
      1450230000,
      riskProfile || 'MODERATE'
    );
  }
}
