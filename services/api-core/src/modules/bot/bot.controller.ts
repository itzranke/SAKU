import { Controller, Post, Body } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('telegram')
  handleTelegramWebhook(@Body() payload: any) {
    return this.botService.processTelegramWebhook(payload);
  }

  @Post('parse')
  parseMessage(@Body() body: { message: string }) {
    return this.botService.parseMessage(body.message);
  }
}
