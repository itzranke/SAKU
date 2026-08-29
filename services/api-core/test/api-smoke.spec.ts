import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('SAKU API Core Integration Smoke Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Auth Module - Request OTP with Exponential Backoff', async () => {
    const authService = app.get('AuthService');
    const res = authService.requestOtp('user@saku.app');
    expect(res.identifier).toBe('user@saku.app');
    expect(res.requestCount).toBe(1);
  });

  it('2. Accounts Module - Retrieve Aggregate Net Worth', async () => {
    const accountsService = app.get('AccountsService');
    const res = accountsService.getAccounts();
    expect(res.netWorthIDR).toBeGreaterThan(0);
    expect(res.accounts.length).toBeGreaterThan(0);
  });

  it('3. Trading Module - Receive MT5 Payload Sync', async () => {
    const tradingService = app.get('TradingService');
    const res = tradingService.syncMt5Payload({
      account_id: '1048291',
      broker: 'HFM MT5',
      currency: 'USD',
      balance: 25000,
      equity: 25400,
      margin: 1200,
      free_margin: 24200,
      timestamp: Date.now(),
    });
    expect(res.status).toBe('success');
    expect(res.equity).toBe(25400);
  });

  it('4. Bot Module - Parse Quick Chat Input', async () => {
    const botService = app.get('BotService');
    const parsed = botService.parseMessage('Kopi 25k BCA');
    expect(parsed.amount).toBe(25000);
    expect(parsed.account).toBe('Bank BCA');
  });

  it('5. SONZI Module - Calculate Health Metrics', async () => {
    const sonziService = app.get('SonziService');
    const metrics = sonziService.calculateHealthMetrics();
    expect(metrics.dsrPercent).toBeLessThan(35);
    expect(metrics.emergencyFundMonths).toBeGreaterThanOrEqual(6);
  });
});
