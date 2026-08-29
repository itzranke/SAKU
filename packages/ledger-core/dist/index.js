"use strict";
/**
 * SAKU Immutable Double-Entry Ledger Core
 * Enforces: Sum(Debits * Rate) - Sum(Credits * Rate) === 0
 *
 * PRINCIPLES (hard rules for every consumer — api-core, apps/web, MT5 bridge):
 *  1. Saldo TIDAK PERNAH diedit langsung. Saldo adalah hasil derivasi dari jurnal debit/kredit.
 *  2. Jurnal bersifat APPEND-ONLY dan tidak seimbang = ditolak (lihat validateJournalEntries).
 *  3. Semua leg memakai nilai dasar (base): amount * exchangeRate. Base currency workspace: IDR.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PNL_ACCOUNT_TYPES = exports.LIABILITY_ACCOUNT_TYPES = exports.ASSET_ACCOUNT_TYPES = exports.COA = void 0;
exports.validateJournalEntries = validateJournalEntries;
/**
 * Validates whether a proposed ledger journal is balanced across debits and credits.
 */
function validateJournalEntries(entries) {
    if (!entries || entries.length < 2) {
        return {
            isValid: false,
            totalDebits: 0,
            totalCredits: 0,
            imbalanceDelta: 0,
            error: 'A ledger journal entry must contain at least two leg entries (Debit and Credit).',
        };
    }
    let totalDebits = 0;
    let totalCredits = 0;
    for (const entry of entries) {
        const rate = entry.exchangeRate ?? 1.0;
        const baseValue = entry.amount * rate;
        if (entry.amount > 0) {
            totalDebits += baseValue;
        }
        else {
            totalCredits += Math.abs(baseValue);
        }
    }
    const delta = Math.abs(totalDebits - totalCredits);
    // Precision threshold for floating point comparison in JS (0.0001 base currency unit)
    const isValid = delta < 0.0001;
    return {
        isValid,
        totalDebits: Number(totalDebits.toFixed(4)),
        totalCredits: Number(totalCredits.toFixed(4)),
        imbalanceDelta: Number(delta.toFixed(4)),
        error: isValid ? undefined : `Unbalanced Journal Entry: Debits (${totalDebits}) != Credits (${totalCredits}). Delta: ${delta}`,
    };
}
/** Standard chart-of-accounts codes used by all SAKU seeds & mappers. */
exports.COA = {
    EQUITY: '3000', // Owner's Equity (opening balances land here)
    INCOME: '4000', // General income (salary, gifts, etc.)
    TRADING_INCOME: '4100', // Realized trading profit (MT5/broker)
    EXPENSE: '5000', // General expense bucket
};
exports.ASSET_ACCOUNT_TYPES = new Set([
    'BANK',
    'EWALLET',
    'CASH',
    'INVESTMENT',
    'TRADING',
]);
exports.LIABILITY_ACCOUNT_TYPES = new Set(['CREDIT_CARD']);
exports.PNL_ACCOUNT_TYPES = new Set([
    'OWNERS_EQUITY',
    'INCOME',
    'EXPENSE',
]);
__exportStar(require("./journal-mapping"), exports);
__exportStar(require("./balances"), exports);
