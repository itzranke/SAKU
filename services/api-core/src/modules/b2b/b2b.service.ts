import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface B2bApiKey {
  clientId: string;
  clientSecret: string;
  partnerName: string;
  scopes: string[];
  createdAt: string;
}

@Injectable()
export class B2bService {
  private activeKeys = new Map<string, B2bApiKey>();

  createApiKey(partnerName: string): B2bApiKey {
    const clientId = `saku_pk_${Math.random().toString(36).substring(2, 10)}`;
    const clientSecret = `saku_sk_${Math.random().toString(36).substring(2, 18)}`;

    const keyObj: B2bApiKey = {
      clientId,
      clientSecret,
      partnerName,
      scopes: ['accounts:read', 'transactions:read', 'ledger:verify'],
      createdAt: new Date().toISOString(),
    };

    this.activeKeys.set(clientId, keyObj);
    return keyObj;
  }

  verifyApiKey(clientId: string): B2bApiKey {
    const key = this.activeKeys.get(clientId);
    if (!key) {
      throw new UnauthorizedException('B2B API Key tidak valid atau telah dicabut.');
    }
    return key;
  }

  getOpenFinanceAggregatedData(clientId: string) {
    this.verifyApiKey(clientId);

    return {
      partner: 'Open Finance B2B Partner',
      workspaceId: 'ws-corporate-001',
      accounts: [
        { accountId: 'acc-bca-01', name: 'Bank BCA Operational', balance: 185000000, currency: 'IDR' },
        { accountId: 'acc-mandiri-02', name: 'Bank Mandiri Treasury', balance: 60000000, currency: 'IDR' },
      ],
      ledgerLineageVerified: true,
      timestamp: new Date().toISOString(),
    };
  }
}
