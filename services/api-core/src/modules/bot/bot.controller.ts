import { Controller, Post, Body } from '@nestjs/common';
import { BotService } from './bot.service';
import { TelegramConfigService } from './telegram-config.service';

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly telegramConfigService: TelegramConfigService
  ) {}

  @Post('telegram')
  handleTelegramWebhook(@Body() payload: any) {
    return this.botService.processTelegramWebhook(payload);
  }

  @Post('parse')
  parseMessage(@Body() body: { message: string }) {
    return this.botService.parseMessage(body.message);
  }

  @Post('set-webhook')
  setWebhook(@Body() body: { botToken: string; webhookUrl: string }) {
    return this.telegramConfigService.setTelegramWebhook(
      body.botToken,
      body.webhookUrl || 'https://api.saku.app/api/v1/bot/telegram'
    );
  }
}
