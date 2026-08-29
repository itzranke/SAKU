/**
 * StatementImportConnector (ADR-022 M6) — reconciliation from broker documents.
 *
 * The official fallback when a broker/prop-firm server is not reachable by a cloud connector
 * (and the ground-truth check even when it is): user uploads an MT5 statement / CSV, rows are
 * staged for review, approved entries become journals. Cadence is therefore 0 — no timer, and
 * no credential of any kind is stored: the document is the input.
 *
 * It shares the journal pipeline with the cloud connector on purpose: same double-entry write
 * path, same `processed_deals` dedupe, different `source` badge (STATEMENT_IMPORT vs MT5_SYNC).
 */
import { normalizeMt5SyncPayload, RawMt5SyncPayload } from '../trading/mt5-payload';
import { Connector } from './connector';

export class StatementImportConnector implements Connector {
  readonly type = 'MT5_STATEMENT';
  readonly label = 'Import statement/CSV MT5 (rekonsiliasi, manual)';
  readonly status = 'manual' as const;
  readonly direction = 'upload' as const;
  readonly syncIntervalSec = 0;
  readonly credentialRef = { kind: 'none' } as const;

  describe() {
    return {
      type: this.type,
      label: this.label,
      status: this.status,
      direction: this.direction,
      syncIntervalSec: this.syncIntervalSec,
      credentialRef: this.credentialRef,
    };
  }

  /**
   * Statement rows that carry MT5 deal columns (ticket/profit/commission/swap) normalize to the
   * same internal shape as a live pull; anything else stays in the staging CSV flow
   * (`modules/staging`) and is posted as an ordinary balanced journal.
   */
  normalize(raw: unknown) {
    const normalized = normalizeMt5SyncPayload((raw ?? {}) as RawMt5SyncPayload);
    return { deals: normalized.deals, errors: normalized.errors };
  }
}

export const statementImportConnector = new StatementImportConnector();
