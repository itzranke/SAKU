import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding SAKU Chart of Accounts...');

  // Create Default Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'default-workspace-id' },
    update: {},
    create: {
      id: 'default-workspace-id',
      name: 'Personal Workspace',
      baseCurrency: 'IDR',
    },
  });

  console.log(`✅ Workspace created: ${workspace.name}`);

  // Chart of Accounts Template
  const defaultAccounts = [
    // ASSETS
    { code: '1010', name: 'Bank BCA', type: AccountType.BANK, currency: 'IDR' },
    { code: '1020', name: 'Bank Mandiri', type: AccountType.BANK, currency: 'IDR' },
    { code: '1030', name: 'Bank BRI', type: AccountType.BANK, currency: 'IDR' },
    { code: '1110', name: 'GoPay', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1120', name: 'OVO', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1130', name: 'ShopeePay', type: AccountType.EWALLET, currency: 'IDR' },
    { code: '1200', name: 'Physical Cash Wallet', type: AccountType.CASH, currency: 'IDR' },
    { code: '1300', name: 'Stock Broker (IDX)', type: AccountType.INVESTMENT, currency: 'IDR' },
    { code: '1400', name: 'MetaTrader 5 Forex Account', type: AccountType.TRADING, currency: 'USD' },

    // LIABILITIES
    { code: '2010', name: 'BCA Credit Card', type: AccountType.CREDIT_CARD, currency: 'IDR' },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: {
        workspaceId_code: {
          workspaceId: workspace.id,
          code: acc.code,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
      },
    });
  }

  console.log('✅ Default Chart of Accounts seeded successfully.');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
