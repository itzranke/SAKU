import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountsService {
  private accounts = [
    { id: '1', name: 'Bank BCA', type: 'BANK', balance: 185000000, currency: 'IDR' },
    { id: '2', name: 'Bank Mandiri', type: 'BANK', balance: 60000000, currency: 'IDR' },
    { id: '3', name: 'GoPay / OVO', type: 'EWALLET', balance: 12500000, currency: 'IDR' },
    { id: '4', name: 'Physical Cash Wallet', type: 'CASH', balance: 3000000, currency: 'IDR' },
    { id: '5', name: 'IDX Equities', type: 'INVESTMENT', balance: 450000000, currency: 'IDR' },
    { id: '6', name: 'MetaTrader 5 Forex Account', type: 'TRADING', balance: 25400, currency: 'USD', eqIDR: 393700000 },
  ];

  getAccounts() {
    return {
      workspaceId: 'default-workspace-id',
      accounts: this.accounts,
      netWorthIDR: 1450230000,
    };
  }

  createAccount(data: { name: string; type: string; currency: string; initialBalance: number }) {
    const newAcc = {
      id: `acc-${Date.now()}`,
      name: data.name,
      type: data.type,
      currency: data.currency,
      balance: data.initialBalance || 0,
    };
    this.accounts.push(newAcc);
    return newAcc;
  }
}
