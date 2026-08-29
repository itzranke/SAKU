/**
 * SAKU Chart-of-Accounts + demo journal seeder (run via `pnpm --filter @saku/database db:seed`).
 * Journals are APPEND-ONLY: re-running this seed is idempotent per (description+date) guard below,
 * and there is deliberately no "reset balance" — corrections = reversing journals.
 */
import { PrismaClient, AccountType, SourceType } from '@prisma/client';

const prisma = new PrismaClient();
const WORKSPACE_ID = 'default-workspace-id';

async function seed() {
  console.log('🌱 Seeding SAKU Chart of Accounts...');

  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    update: {},
    create: { id: WORKSPACE_ID, name: 'Personal Workspace', baseCurrency: 'IDR' },
  });

  const defaultAccounts: Array<{ code: string; name: string; type: AccountType; currency: string }> = [
    // ASSETS
    { code: '1010', name: 'Bank BCA', type: AccountType.BANK, currency: 'IDR' },
    { code: '1020', name: 'Bank Mandiri', type: AccountType.BANK, currency: 'IDR' },
    { code: '1030', name: 'Bank BRI', type: AccountType.BANK, currency: 'IDR' },
    { code: '1110', name: 'GoPay', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1120', name: 'OVO', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1130', name: 'ShopeePay', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1200', name: 'Physical Cash Wallet', type: AccountType.CASH, currency: 'IDR' },
    { code: '1300', name: 'IDX Equities', type: AccountType.INVESTMENT, currency: 'IDR' },
    { code: '1400', name: 'MetaTrader 5 Forex', type: AccountType.TRADING, currency: 'USD' },
    // LIABILITIES
    { code: '2010', name: 'BCA Credit Card', type: AccountType.CREDIT_CARD, currency: 'IDR' },
    // EQUITY + P&L (opening balances & flows land here)
    { code: '3000', name: "Owner's Equity", type: AccountType.OWNERS_EQUITY, currency: 'IDR' },
    { code: '4000', name: 'Pendapatan Umum', type: AccountType.INCOME, currency: 'IDR' },
    { code: '4100', name: 'Pendapatan Trading', type: AccountType.INCOME, currency: 'IDR' },
    { code: '5000', name: 'Beban Umum', type: AccountType.EXPENSE, currency: 'IDR' },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { workspaceId_code: { workspaceId: WORKSPACE_ID, code: acc.code } },
      update: {},
      create: { workspaceId: WORKSPACE_ID, ...acc },
    });
  }
  console.log(`✅ ${defaultAccounts.length} accounts seeded.`);

  const accountByCode = new Map<string, string>();
  const rows = await prisma.account.findMany({ where: { workspaceId: WORKSPACE_ID }, select: { id: true, code: true } });
  for (const r of rows) accountByCode.set(r.code, r.id);

  type Leg = { code: string; amount: number; currency?: string; rate?: number };
  const journals: Array<{ description: string; date: string; source: SourceType; txType?: string; category?: string; legs: Leg[] }> = [
    {
      description: 'Saldo Awal — Double-Entry Opening Journal (SAKU seed)',
      date: '2026-08-01',
      source: SourceType.RECONCILIATION,
      legs: [
        { code: '1010', amount: 185_000_000 },
        { code: '1020', amount: 60_000_000 },
        { code: '1110', amount: 12_500_000 },
        { code: '1200', amount: 3_000_000 },
        { code: '1300', amount: 450_000_000 },
        { code: '1400', amount: 25_400, currency: 'USD', rate: 15500 },
        { code: '2010', amount: -149_770_000 },
        { code: '3000', amount: -(185_000_000 + 60_000_000 + 12_500_000 + 3_000_000 + 450_000_000 + 25_400 * 15500 - 149_770_000) },
      ],
    },
    {
      description: 'Gaji Bulanan',
      date: '2026-08-28',
      source: SourceType.MANUAL,
      txType: 'INCOME',
      legs: [
        { code: '1010', amount: 35_000_000 },
        { code: '4000', amount: -35_000_000 },
      ],
    },
    {
      description: 'Transfer ke MT5 Broker',
      date: '2026-08-28',
      source: SourceType.MANUAL,
      txType: 'TRANSFER',
      legs: [
        { code: '1400', amount: 15_500_000, currency: 'IDR' },
        { code: '1020', amount: -15_500_000 },
      ],
    },
    {
      description: 'Pembayaran Tagihan Listrik',
      date: '2026-08-27',
      source: SourceType.MANUAL,
      txType: 'EXPENSE',
      category: 'Tagihan & Utilitas',
      legs: [
        { code: '5000', amount: 1_250_000 },
        { code: '1110', amount: -1_250_000 },
      ],
    },
    {
      description: 'Profit Trade EURUSD (MT5)',
      date: '2026-08-26',
      source: SourceType.MT5_SYNC,
      txType: 'TRADING_PROFIT',
      legs: [
        { code: '1400', amount: 480, currency: 'USD', rate: 15500 },
        { code: '4100', amount: -480 * 15500 },
      ],
    },
  ];

  let posted = 0;
  for (const j of journals) {
    const exists = await prisma.ledgerJournal.findFirst({ where: { workspaceId: WORKSPACE_ID, description: j.description, postedAt: new Date(`${j.date}T00:00:00.000Z`) } });
    if (exists) continue;
    await prisma.ledgerJournal.create({
      data: {
        workspaceId: WORKSPACE_ID,
        description: j.description,
        source: j.source,
        txType: j.txType,
        category: j.category,
        postedAt: new Date(`${j.date}T00:00:00.000Z`),
        entries: {
          create: j.legs.map((l) => ({
            accountId: accountByCode.get(l.code)!,
            amount: l.amount,
            currency: l.currency ?? 'IDR',
            exchangeRate: l.rate ?? 1,
          })),
        },
      },
    });
    posted++;
  }
  console.log(`✅ Journals seeded: ${posted} new (${journals.length - posted} already present).`);
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
