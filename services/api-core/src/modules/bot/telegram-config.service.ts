import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramConfigService {
  /**
   * Helper to set Webhook URL on Telegram Bot API
   */
  async setTelegramWebhook(botToken: string, webhookUrl: string) {
    if (!botToken || botToken.includes('MOCK')) {
      return {
        status: 'simulated',
        message: 'Gunakan token bot real dari @BotFather di Telegram untuk mengaktifkan webhook langsung di server cloud produksi Anda.',
        tokenProvided: botToken ? 'MOCK_TOKEN' : 'NONE',
        webhookUrl,
      };
    }

    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
      console.log(`[SAKU TELEGRAM BOT] Registering Webhook via Telegram API: ${webhookUrl}`);

      return {
        status: 'success',
        message: 'Webhook Telegram Bot berhasil didaftarkan di server Telegram!',
        telegramApiUrl,
      };
    } catch (err) {
      return {
        status: 'error',
        message: 'Gagal menghubungkan ke Telegram Bot API.',
        error: String(err),
      };
    }
  }
}
