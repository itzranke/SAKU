/**
 * Connectors routes (ADR-022 M6) — read-only view of the Connector registry.
 *
 *   GET /api/v1/connectors    the short list of asset feeds SAKU ships, each with:
 *                             type, label, status, direction, syncIntervalSec,
 *                             credentialRef (WHERE a credential lives — kind/field/mode/
 *                             algorithm, NEVER the secret itself) and normalizer
 *                             (a description of the mapping, not the function).
 *
 * Guardrails kept here on purpose: this endpoint is a descriptor surface only. There is no
 * POST/PUT/PATCH (the registry is code, configured via env + Settings → Integrations), and
 * `credentialRef` describes storage policy — no `credentialCipher`, no password, no token
 * ever appears (RedactionInterceptor stays as the net).
 */
import { Controller, Get } from '@nestjs/common';
import { describeConnectors } from './registry';

@Controller('connectors')
export class ConnectorsController {
  @Get()
  list() {
    return describeConnectors();
  }
}
