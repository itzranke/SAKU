import { describe, expect, it } from 'vitest';
import {
  installConsoleRedaction,
  isSensitiveFieldName,
  redactForLog,
  redactSecretText,
  scrubLogArgs,
  stripSensitive,
} from './secret-redaction';

describe('isSensitiveFieldName', () => {
  it('catches credential-ish names in every casing', () => {
    for (const key of [
      'password',
      'investor_password',
      'investorPassword',
      'masterPassword',
      'sessionToken',
      'token',
      'credentialCipher',
      'cipher',
      'apiKey',
      'api_key',
      'Authorization',
      'set-cookie',
      'secret',
    ]) {
      expect(isSensitiveFieldName(key)).toBe(true);
    }
  });

  it('leaves SAKU public fields alone (no false positives that break contracts)', () => {
    for (const key of [
      'login',
      'label',
      'server',
      'port',
      'enabled',
      'type',
      'hasCredential',
      'credentialMode',
      'credentialAlgorithm',
      'vendorAccountId',
      'key', // /security/rate-limit-check legitimately answers with the client key
      'journalCount',
      'netWorthIDR',
    ]) {
      expect(isSensitiveFieldName(key)).toBe(false);
    }
  });
});

describe('redactForLog / stripSensitive', () => {
  const body = {
    login: '700001',
    server: 'HFM-Demo',
    investor_password: 'S3cr3t-Investor!',
    nested: { credentialCipher: 'iv:tag:data', label: 'ok' },
    list: [{ token: 'abc' }, { keep: 'x' }],
  };

  it('keeps keys, replaces values (debuggable)', () => {
    const r = redactForLog(body) as any;
    expect(r.login).toBe('700001');
    expect(r.investor_password).toBe('[REDACTED]');
    expect(r.nested.credentialCipher).toBe('[REDACTED]');
    expect(r.nested.label).toBe('ok');
    expect(r.list[0]).toEqual({ token: '[REDACTED]' });
    expect(r.list[1]).toEqual({ keep: 'x' });
  });

  it('removes the key entirely (responses)', () => {
    const s = stripSensitive<any>(body);
    expect('investor_password' in s).toBe(false);
    expect(s.login).toBe('700001');
    expect('credentialCipher' in s.nested).toBe(false);
    expect(s.nested.label).toBe('ok');
    expect(s.list[0]).toEqual({});
  });
});

describe('redactSecretText', () => {
  it('scrubs k=v and JSON-ish snippets', () => {
    expect(redactSecretText('login failed password=hunter2 for 700001')).toBe('login failed password=[REDACTED] for 700001');
    expect(redactSecretText('{"investorPassword":"abc-123","login":"77"}')).toContain('"investorPassword":"[REDACTED]"');
    expect(redactSecretText("credentialCipher='iv:tag:data'")).toContain("credentialCipher='[REDACTED]'");
    expect(redactSecretText('Authorization: Bearer eyJhbGciOiJIUzI1NiIxNA')).toContain('[REDACTED]');
  });

  it('leaves ordinary log lines untouched', () => {
    const line = 'Journal 8f21 posted from deal 700001:910001 (MT5_SYNC, 1472500 base-IDR).';
    expect(redactSecretText(line)).toBe(line);
  });
});

describe('console redaction net', () => {
  it('scrubs objects and free-form strings on the way to the sink', () => {
    const scrubbed = scrubLogArgs([
      'request body',
      { login: '700001', investor_password: 'sekret' },
      'plain string password=sekret',
    ]) as [string, Record<string, unknown>, string];

    expect(JSON.stringify(scrubbed[1])).toContain('[REDACTED]');
    expect(JSON.stringify(scrubbed[1])).not.toContain('sekret');
    expect(scrubbed[1].login).toBe('700001');
    expect(scrubbed[2]).toBe('plain string password=[REDACTED]');
  });

  it('never throws on exotic values (circular) and still hides secrets', () => {
    const circular: any = { investor_password: 'sekret' };
    circular.self = circular;
    const [scrubbed] = scrubLogArgs([circular]);
    expect(String(scrubbed)).not.toContain('sekret');
  });

  it('installConsoleRedaction wraps the sinks once (idempotent)', () => {
    installConsoleRedaction();
    installConsoleRedaction();
    expect((console.log as any).__sakuRedacted).toBe(true);
    expect((console.warn as any).__sakuRedacted).toBe(true);
  });
});
