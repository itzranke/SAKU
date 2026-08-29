/**
 * Connector registry (ADR-022 M6) — the short list SAKU actually ships.
 *
 * Deliberately not a plugin system: two entries, one file to read. Adding an asset source
 * (bank, crypto exchange, e-wallet, physical assets, debts) means implementing `Connector`
 * and adding one line here — nothing else changes.
 */
import { Connector } from './connector';
import { Mt5CloudConnector, mt5CloudConnector } from './mt5-cloud.connector';
import { StatementImportConnector, statementImportConnector } from './statement-import.connector';

export const CONNECTORS: Connector[] = [mt5CloudConnector, statementImportConnector];

export function connectorTypes(): string[] {
  return CONNECTORS.map((c) => c.type);
}

/** Description surface for docs/health panels — never includes secret material. */
export function describeConnectors() {
  return CONNECTORS.map((c) =>
    c instanceof Mt5CloudConnector || c instanceof StatementImportConnector ? c.describe() : { type: c.type, label: c.label, status: c.status, direction: c.direction, syncIntervalSec: c.syncIntervalSec }
  );
}
