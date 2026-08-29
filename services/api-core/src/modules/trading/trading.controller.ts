import { Controller, GET, POST, Body } from '@nestjs/common';
import { TradingService, Mt5Payload } from './trading.service';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @POST('sync')
  syncMt5(@Body() payload: Mt5Payload) {
    return this.tradingService.syncMt5Payload(payload);
  }

  @GET('state')
  getTradingState() {
    return this.tradingService.getTradingAccountState();
  }
}
