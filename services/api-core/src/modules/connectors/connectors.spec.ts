import { describe, expect, it } from 'vitest';
import { CONNECTORS, connectorTypes, describeConnectors } from './registry';
import { mt5CloudConnector } from './mt5-cloud.connector';
import { statementImportConnector } from './statement-import.connector';
import {
  DEALS_INTERVAL_MIN,
  SNAPSHOT_INTERVAL_SEC,
} from '../trading/sync-scheduler.service';

/**
 * M6: MT5 is one connector among many behind a generic `Connector` contract.
 * These tests are drift guards — they fail if the abstraction ever disagrees with the
 * scheduler it describes, or if a connector starts claiming it stores a secret it must not.
 */
describe('connectors (ADR-022 M6)', () => {
  it('menegaskan daftar konektor yang dikirim SAKU', () => {
    expect(connectorTypes()).toEqual(['MT5_CLOUD', 'MT5_STATEMENT']);
  });

  it('tiap konektor mematuhi kontrak (tipe, label, cadence, credentialRef)', () => {
    for (const c of CONNECTORS) {
      expect(typeof c.type).toBe('string');
      expect(typeof c.label).toBe('string');
      expect(Number.isFinite(c.syncIntervalSec) && c.syncIntervalSec >= 0).toBe(true);
      expect(['pull', 'upload']).toContain(c.direction);
      expect(typeof c.normalize).toBe('function');
      expect(c.credentialRef).toBeTruthy();
    }
  });

  it('cadence konektor MT5 = angka yang dipakai scheduler (satu sumber kebenaran)', () => {
    expect(mt5CloudConnector.syncIntervalSec).toBe(SNAPSHOT_INTERVAL_SEC);
    expect(mt5CloudConnector.dealsIntervalMin).toBe(DEALS_INTERVAL_MIN);
    expect(mt5CloudConnector.firstSyncDays).toBeGreaterThanOrEqual(1);
  });

  it('kredensial MT5 = ref terenkripsi read-only; statement = tidak ada kredensial', () => {
    expect(mt5CloudConnector.credentialRef).toEqual({
      kind: 'encrypted_integration',
      field: 'investor_password',
      mode: 'investor-read-only',
      algorithm: 'AES-256-GCM',
    });
    expect(statementImportConnector.credentialRef).toEqual({ kind: 'none' });
    expect(statementImportConnector.syncIntervalSec).toBe(0);
  });

  it('surface deskripsi tidak pernah memuat materi rahasia', () => {
    const json = JSON.stringify(describeConnectors());
    expect(json).not.toMatch(/cipher|password":\s*"|token/i);
    expect(json).toContain('investor-read-only');
  });

  it('kedua konektor menormalkan dialek yang sama ke bentuk internal yang sama', () => {
    const raw = {
      account: '50123456',
      currency: 'USD',
      closed_deals: [{ ticket: 777, symbol: 'EURUSD', profit: 12.5, commission: -0.4, time: '2026-08-20T10:00:00Z' }],
    };
    const cloud = mt5CloudConnector.normalize(raw);
    const stmt = statementImportConnector.normalize(raw);
    expect(cloud.errors).toEqual([]);
    expect(cloud.deals).toHaveLength(1);
    expect(cloud.deals[0]).toMatchObject({ ticket: '777', symbol: 'EURUSD', pnl: 12.1 });
    expect(stmt.deals).toEqual(cloud.deals);
  });

  it('payload rusak dilaporkan lewat errors, bukan dilempar (kontrak pipeline)', () => {
    const res = mt5CloudConnector.normalize({ account: '', closed_deals: [] });
    expect(res.deals).toEqual([]);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
