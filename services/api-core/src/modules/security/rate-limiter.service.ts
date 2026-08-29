import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface RateLimitStatus {
  key: string;
  requestCount: number;
  remaining: number;
  resetSeconds: number;
  tier: 'HOT_0_12M' | 'WARM_12_36M' | 'COLD_ARCHIVE';
}

@Injectable()
export class SecurityService {
  private requestWindow = new Map<string, { count: number; windowStart: number }>();

  /**
   * Sliding Window Rate-Limiter (Max 100 requests per minute per IP)
   */
  checkRateLimit(clientIp: string, maxLimit = 100, windowMs = 60000): RateLimitStatus {
    const now = Date.now();
    const record = this.requestWindow.get(clientIp) || { count: 0, windowStart: now };

    if (now - record.windowStart > windowMs) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count += 1;
    }

    this.requestWindow.set(clientIp, record);

    if (record.count > maxLimit) {
      throw new HttpException(
        'Batas pemanggilan API terlampaui (Rate limit exceeded). Silakan tunggu 60 detik.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const remaining = Math.max(0, maxLimit - record.count);
    const resetSeconds = Math.ceil((windowMs - (now - record.windowStart)) / 1000);

    return {
      key: clientIp,
      requestCount: record.count,
      remaining,
      resetSeconds,
      tier: 'HOT_0_12M',
    };
  }

  /**
   * Data Retention Tiering Classifier
   */
  classifyDataTier(transactionDate: string): 'HOT_0_12M' | 'WARM_12_36M' | 'COLD_ARCHIVE' {
    const txDate = new Date(transactionDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth());

    if (diffMonths <= 12) return 'HOT_0_12M';
    if (diffMonths <= 36) return 'WARM_12_36M';
    return 'COLD_ARCHIVE';
  }
}
