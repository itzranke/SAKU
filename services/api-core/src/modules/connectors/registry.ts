/**
 * Connector registry (ADR-022 M6) — the short list SAKU actually ships.
 *
 * Deliberately not a plugin system: two entries, one file to read. Adding an asset source
 * (bank, crypto exchange, e-wallet, physical assets, debts) means implementing `Connector`
 * and adding one line here — nothing else changes.
 */
import { Connector, ConnectorDescription } from './connector';
import { mt5CloudConnector } from './mt5-cloud.connector';
import { statementImportConnector } from './statement-import.connector';

export const CONNECTORS: Connector[] = [mt5CloudConnector, statementImportConnector];

export function connectorTypes(): string[] {
  return CONNECTORS.map((c) => c.type);
}

/**
 * Description surface for docs/health panels — never includes secret material.
 *
 * describe() ada di KONTRAK `Connector`, jadi cukup dipanggil: konektor baru otomatis ikut
 * tanpa menyunting berkas ini (sebelumnya ada cabang `else` yang menyalin 7 field secara
 * manual dan hanya benar untuk dua kelas yang dikenal — audit #4).
 */
export function describeConnectors(): ConnectorDescription[] {
  return CONNECTORS.map((c) => c.describe());
}
