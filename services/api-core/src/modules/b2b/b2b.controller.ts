import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { B2bService } from './b2b.service';

@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Post('keys/create')
  createKey(@Body() body: { partnerName: string }) {
    return this.b2bService.createApiKey(body.partnerName || 'Corporate Partner');
  }

  @Get('accounts')
  getOpenFinanceAccounts(@Query('clientId') clientId?: string) {
    return this.b2bService.getOpenFinanceAggregatedData(clientId || 'saku_pk_sample');
  }
}
