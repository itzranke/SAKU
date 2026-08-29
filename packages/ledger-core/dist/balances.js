"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAccountBalances = computeAccountBalances;
exports.journalToDisplayRow = journalToDisplayRow;
exports.buildLedgerSnapshot = buildLedgerSnapshot;
/**
 * balances.ts — Derives account balances, aggregates (net worth) and recent
 * journal "display rows" purely from append-only journals. This is the ONLY
 * sanctioned way to read money out of the engine: balances are NEVER stored raw.
 */
const index_1 = require("./index");
function computeAccountBalances(accounts, journals) {
    // Plain-object accumulator (no Map iteration) so the engine stays compatible
    // with every consumer target, including apps/web's default TS target.
    const acc = {};
    for (const a of accounts) {
        acc[a.code] = {
            code: a.code,
            name: a.name,
            type: a.type,
            currency: a.currency,
            balanceNative: 0,
            balanceBaseIDR: 0,
        };
    }
    for (const j of journals) {
        for (const e of j.entries) {
            const b = acc[e.accountCode];
            if (!b)
                continue; // unknown leg account -> ignored by derivation, but journal stays immutable
            b.balanceBaseIDR += e.amount * (e.exchangeRate ?? 1);
            if (e.currency.toUpperCase() === b.currency.toUpperCase()) {
                b.balanceNative += e.amount;
            }
            b.lastEntryAt = j.postedAt;
        }
    }
    const round = (n) => Number(n.toFixed(4));
    for (const key of Object.keys(acc)) {
        const b = acc[key];
        b.balanceNative = round(b.balanceNative);
        b.balanceBaseIDR = round(b.balanceBaseIDR);
    }
    return Object.keys(acc).map((k) => acc[k]);
}
/**
 * Chooses the "primary" leg of a journal for the transaction list:
 * the first asset/liability leg (P&L + equity legs are excluded because they
 * are the accounting counterpart, not what the user perceives as "the money").
 */
function journalToDisplayRow(journal, accounts) {
    const typeOf = new Map(accounts.map((a) => [a.code, a]));
    const nameOf = new Map(accounts.map((a) => [a.code, a.name]));
    const primary = journal.entries.find((e) => {
        const a = typeOf.get(e.accountCode);
        return a && (index_1.LIABILITY_ACCOUNT_TYPES.has(a.type) || index_1.ASSET_ACCOUNT_TYPES.has(a.type)) && e.amount < 0;
    }) ??
        journal.entries.find((e) => {
            const a = typeOf.get(e.accountCode);
            return a && (index_1.LIABILITY_ACCOUNT_TYPES.has(a.type) || index_1.ASSET_ACCOUNT_TYPES.has(a.type));
        }) ??
        journal.entries[0];
    const acc = primary ? typeOf.get(primary.accountCode) : undefined;
    const signed = primary ? primary.amount * (primary.exchangeRate ?? 1) : 0;
    // Sign is the raw ledger sign of the primary leg in base currency:
    // debit (+) on an asset = money in, credit (-) = money out; liability credit (-) reads as debt added.
    return {
        id: journal.id,
        date: journal.date,
        description: journal.description,
        source: journal.source,
        type: journal.txType ?? (journal.source === 'MT5_SYNC' ? 'TRADING_PROFIT' : 'EXPENSE'),
        account: primary ? (nameOf.get(primary.accountCode) ?? primary.accountCode) : '—',
        amount: signed,
        currency: 'IDR',
        category: journal.category,
    };
}
function buildLedgerSnapshot(workspaceId, accounts, journals, opts = {}) {
    const balances = computeAccountBalances(accounts, journals);
    const typeByCode = new Map(accounts.map((a) => [a.code, a.type]));
    let totalAssetsIDR = 0;
    let totalDebtsIDR = 0;
    let liquidityCashIDR = 0;
    for (const b of balances) {
        const t = typeByCode.get(b.code);
        if (index_1.ASSET_ACCOUNT_TYPES.has(t)) {
            totalAssetsIDR += b.balanceBaseIDR;
            if (t === 'BANK' || t === 'CASH' || t === 'EWALLET')
                liquidityCashIDR += b.balanceBaseIDR;
        }
        else if (index_1.LIABILITY_ACCOUNT_TYPES.has(t)) {
            totalDebtsIDR += Math.abs(b.balanceBaseIDR);
        }
    }
    const r = (n) => Math.round(n);
    totalAssetsIDR = r(totalAssetsIDR);
    totalDebtsIDR = r(totalDebtsIDR);
    liquidityCashIDR = r(liquidityCashIDR);
    const recentLimit = opts.recentLimit ?? 25;
    const recentJournals = journals
        .slice(-recentLimit)
        .reverse()
        .map((j) => journalToDisplayRow(j, accounts));
    return {
        workspaceId,
        baseCurrency: 'IDR',
        accounts: balances,
        totals: {
            totalAssetsIDR,
            totalDebtsIDR,
            netWorthIDR: totalAssetsIDR - totalDebtsIDR,
            journalCount: journals.length,
            liquidityCashIDR,
        },
        recentJournals,
        generatedAt: new Date().toISOString(),
    };
}
