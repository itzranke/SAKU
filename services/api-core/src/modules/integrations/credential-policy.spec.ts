import { describe, expect, it } from 'vitest';
import { applyCredentialPolicy, validateIntegrationFields } from './credential-policy';

describe('applyCredentialPolicy — investor password (read-only) only', () => {
  it('accepts investor_password / investorPassword / password aliases', () => {
    for (const key of ['investor_password', 'investorPassword', 'password']) {
      const r = applyCredentialPolicy({ [key]: 'abc' }, 'create');
      expect(r.errors).toEqual([]);
      expect(r.investorPassword).toBe('abc');
    }
  });

  it('rejects master/trader password with copy that names the read-only rule', () => {
    for (const key of ['master_password', 'masterPassword', 'trader_password', 'session_token']) {
      const r = applyCredentialPolicy({ login: '1', investor_password: 'ok', [key]: 'nope' }, 'create');
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors[0]).toMatch(/investor password \(read-only\)/);
    }
  });

  it('rejects client-supplied ciphertext (server writes it, never the caller)', () => {
    const r = applyCredentialPolicy({ credentialCipher: 'iv:tag:data', investor_password: 'x' }, 'create');
    expect(r.errors[0]).toMatch(/credentialCipher/);
  });

  it('create requires a credential; update treats it as optional (rotate only when given)', () => {
    expect(applyCredentialPolicy({}, 'create').errors[0]).toMatch(/investor password \(read-only\)/);
    expect(applyCredentialPolicy({ enabled: false }, 'update').errors).toEqual([]);
  });

  it('caps secret length and refuses non-strings', () => {
    expect(applyCredentialPolicy({ investor_password: 'x'.repeat(200) }, 'create').errors[0]).toMatch(/terlalu panjang/);
    expect(applyCredentialPolicy({ investor_password: 12345 }, 'create').errors[0]).toMatch(/harus berupa string/);
  });
});

describe('validateIntegrationFields', () => {
  it('accepts a well-formed MT5 account', () => {
    const r = validateIntegrationFields({ type: 'MT5_CLOUD', label: 'Fx HFM', login: 700001, server: 'HFM-Demo', port: '443' });
    expect(r.errors).toEqual([]);
    expect(r.value).toEqual({ label: 'Fx HFM', login: '700001', server: 'HFM-Demo', port: 443 });
  });

  it('flags missing/short/oversized pieces individually', () => {
    expect(validateIntegrationFields({}).errors.length).toBe(3);
    const r = validateIntegrationFields({ type: 'MT4', label: 'a', login: 'x', server: 's', port: 70000 });
    expect(r.errors.join(' ')).toMatch(/type harus MT5_CLOUD atau MT5_STATEMENT/);
    expect(r.errors.join(' ')).toMatch(/port harus integer/);
  });

  it('login allows letters (prop-firm logins) but not spaces or symbols', () => {
    expect(validateIntegrationFields({ label: 'ab', login: 'U-10293', server: 'srv' }).errors).toEqual([]);
    expect(validateIntegrationFields({ label: 'ab', login: '10 29', server: 'srv' }).errors.join(' ')).toMatch(/login/);
  });
});
