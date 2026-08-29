import { Injectable } from '@nestjs/common';

export interface StagingTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  suggestedCategory: string;
  suggestedAccount: string;
  isAutoMatched: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Injectable()
export class StagingService {
  private stagingBuffer: StagingTransaction[] = [];

  // Default Auto-Categorization Rule Engine
  private rules = [
    { keyword: 'GRAB', category: 'Transportation', account: 'GoPay / OVO' },
    { keyword: 'GOJEK', category: 'Transportation', account: 'GoPay / OVO' },
    { keyword: 'STARBUCKS', category: 'Food & Beverage', account: 'Bank BCA' },
    { keyword: 'KOPI', category: 'Food & Beverage', account: 'Bank BCA' },
    { keyword: 'PERTAMINA', category: 'Transportation', account: 'Bank Mandiri' },
    { keyword: 'TOKOPEDIA', category: 'Shopping', account: 'Bank BCA' },
    { keyword: 'SHOPEE', category: 'Shopping', account: 'GoPay / OVO' },
    { keyword: 'PLN', category: 'Utilities', account: 'Bank Mandiri' },
  ];

  parseCsvStatement(csvText: string): StagingTransaction[] {
    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    const parsed: StagingTransaction[] = [];

    lines.forEach((line, index) => {
      // Skip header line if detected
      if (index === 0 && line.toLowerCase().includes('date')) return;

      const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
      if (cols.length < 3) return;

      const date = cols[0] || new Date().toISOString().split('T')[0];
      const description = cols[1] || 'Bank Transaction';
      const amount = Math.abs(parseFloat(cols[2]) || 0);
      const type: 'DEBIT' | 'CREDIT' = (cols[3] || '').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';

      // Rule Matching Engine
      let suggestedCategory = 'Uncategorized';
      let suggestedAccount = 'Bank BCA';
      let isAutoMatched = false;

      const descUpper = description.toUpperCase();
      for (const rule of this.rules) {
        if (descUpper.includes(rule.keyword)) {
          suggestedCategory = rule.category;
          suggestedAccount = rule.account;
          isAutoMatched = true;
          break;
        }
      }

      parsed.push({
        id: `stg-${Date.now()}-${index}`,
        date,
        description,
        amount,
        type,
        suggestedCategory,
        suggestedAccount,
        isAutoMatched,
        status: 'PENDING',
      });
    });

    this.stagingBuffer.push(...parsed);
    return parsed;
  }

  getStagingBuffer() {
    return {
      totalPending: this.stagingBuffer.filter((t) => t.status === 'PENDING').length,
      items: this.stagingBuffer,
    };
  }

  approveStagingTransaction(id: string) {
    const item = this.stagingBuffer.find((t) => t.id === id);
    if (item) {
      item.status = 'APPROVED';
    }
    return { status: 'success', item };
  }
}
