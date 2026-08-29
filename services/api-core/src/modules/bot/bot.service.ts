import { Injectable } from '@nestjs/common';

export interface BotParseResult {
  rawText: string;
  amount: number;
  category: string;
  account: string;
  description: string;
  isStagingRequired: boolean; // Flagged if amount > Rp 10.000.000
}

@Injectable()
export class BotService {
  /**
   * Parse quick chat inputs (e.g. "Kopi 25k BCA", "Beli iPhone 15jt Mandiri")
   */
  parseMessage(text: string): BotParseResult {
    const rawText = text.trim();
    const lower = rawText.toLowerCase();

    // 1. Amount Extraction (handles 'k' for thousands, 'jt'/'m' for millions)
    let amount = 0;
    const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*k\b/);
    const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/);
    const rawNumberMatch = lower.match(/\b(\d{4,9})\b/);

    if (jtMatch) {
      amount = parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
    } else if (kMatch) {
      amount = parseFloat(kMatch[1].replace(',', '.')) * 1000;
    } else if (rawNumberMatch) {
      amount = parseInt(rawNumberMatch[1], 10);
    }

    // 2. Account Resolution (Default to BCA if not specified)
    let account = 'Bank BCA';
    if (lower.includes('mandiri')) account = 'Bank Mandiri';
    else if (lower.includes('gopay') || lower.includes('ovo')) account = 'GoPay / OVO';
    else if (lower.includes('cash') || lower.includes('tunai')) account = 'Physical Cash Wallet';

    // 3. Category Inference
    let category = 'General Expense';
    if (lower.includes('kopi') || lower.includes('makan') || lower.includes('resto')) {
      category = 'Food & Beverage';
    } else if (lower.includes('grab') || lower.includes('gojek') || lower.includes('bensin')) {
      category = 'Transportation';
    } else if (lower.includes('saham') || lower.includes('investasi') || lower.includes('crypto')) {
      category = 'Investment';
    }

    // 4. Staging Sandbox Guardrail (> Rp 10.000.000 requires manual approval)
    const STAGING_THRESHOLD = 10000000;
    const isStagingRequired = amount >= STAGING_THRESHOLD;

    return {
      rawText,
      amount,
      category,
      account,
      description: rawText,
      isStagingRequired,
    };
  }

  processTelegramWebhook(payload: any) {
    const text = payload?.message?.text || payload?.text || '';
    const parsed = this.parseMessage(text);

    return {
      status: 'processed',
      parsed,
      replyMessage: parsed.isStagingRequired
        ? `⚠️ Transaksi senilai Rp ${parsed.amount.toLocaleString('id-ID')} memerlukan konfirmasi di SAKU Staging Sandbox sebelum masuk ke Ledger.`
        : `✅ Transaksi catat otomatis: ${parsed.category} - Rp ${parsed.amount.toLocaleString('id-ID')} (${parsed.account})`,
    };
  }
}
