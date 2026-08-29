import { Controller, Get, Post, Body } from '@nestjs/common';
import { TradingService, Mt5Payload } from './trading.service';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('sync')
  syncMt5(@Body() payload: Mt5Payload) {
    return this.tradingService.syncMt5Payload(payload);
  }

  @Post('sync/deals')
  syncDealsOnly(@Body() payload: Mt5Payload) {
    // Convenience for bridges that only push closed deals (no state change).
    return this.tradingService.syncMt5Payload(payload);
  }

  @Get('state')
  getTradingState() {
    return this.tradingService.getTradingAccountState();
  }
}
