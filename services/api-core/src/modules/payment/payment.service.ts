import { Injectable } from '@nestjs/common';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceIDR: number;
  interval: 'MONTHLY';
  features: string[];
}

@Injectable()
export class PaymentService {
  private plans: SubscriptionPlan[] = [
    {
      id: 'plan-pro-monthly',
      name: 'SAKU Pro Monthly',
      priceIDR: 99000,
      interval: 'MONTHLY',
      features: [
        'Akses Penuh Akuntansi Double-Entry Immutable',
        'Sinkronisasi Real-time MetaTrader 5 Forex Engine',
        'Telegram & WhatsApp Fast Ingestion Assistant Bot',
        'SONZI Framework Health Engine & Profil Risiko Custom',
      ],
    },
    {
      id: 'plan-household-vip',
      name: 'SAKU Household & Trader VIP',
      priceIDR: 199000,
      interval: 'MONTHLY',
      features: [
        'Semua Fitur SAKU Pro Monthly',
        'Multi-Tenant Household Sharing dengan Row-Level Security',
        'Statement Import Staging Sandbox Tanpa Batas File',
        'B2B API Key Access & Dedicated Priority Support',
      ],
    },
  ];

  getPlans() {
    return {
      model: 'PURE_MONTHLY_SUBSCRIPTION',
      notice: 'Sistem SAKU menerapkan skema berlangganan murni bulanan (Tanpa Lisensi Seumur Hidup).',
      plans: this.plans,
    };
  }

  createSubscriptionInvoice(planId: string, userEmail: string) {
    const plan = this.plans.find((p) => p.id === planId) || this.plans[0];
    const invoiceId = `INV-SAKU-${Date.now()}`;

    return {
      invoiceId,
      userEmail,
      planName: plan.name,
      amountIDR: plan.priceIDR,
      paymentUrl: `https://checkout.midtrans.com/v2/snap/pay?token=snap_mock_token_${invoiceId}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  handlePaymentWebhook(payload: any) {
    const status = payload?.transaction_status || 'settlement';
    const invoiceId = payload?.order_id || 'INV-UNKNOWN';

    console.log(`[SAKU PAYMENT WEBHOOK] Invoice ${invoiceId} Status: ${status}`);

    return {
      status: 'success',
      invoiceId,
      transactionStatus: status,
      isSubscriptionActive: status === 'settlement' || status === 'capture',
    };
  }
}
