import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StagingService } from './staging.service';

@Controller('staging')
export class StagingController {
  constructor(private readonly stagingService: StagingService) {}

  @Get()
  getStagingBuffer() {
    return this.stagingService.getStagingBuffer();
  }

  @Post('upload-csv')
  uploadCsv(@Body() body: { csvText: string }) {
    return this.stagingService.parseCsvStatement(body.csvText);
  }

  @Post('approve/:id')
  approveTransaction(@Param('id') id: string) {
    return this.stagingService.approveStagingTransaction(id);
  }
}
