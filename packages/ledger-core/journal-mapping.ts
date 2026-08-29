/**
 * journal-mapping.ts — Pure mappers from "simple transaction" (UX model) to
 * strict double-entry legs (accounting model). No I/O, no framework imports.
 */
import {
  AccountDef,
  COA,
  JournalValidationResult,
  LedgerEntryInput,
  SourceType,
  TransactionType,
  validateJournalEntries,
} from './index';

/** Base-currency (IDR) conversion defaults. Callers may override per-leg. */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  IDR: 1,
  USD: 15500,
  EUR: 16900,
  SGD: 11800,
  AUD: 10300,
};

export interface SimpleTransactionInput {
  /** Positive magnitude. Sign is derived from `type`. */
  amount: number;
  type: TransactionType;
  description: string;
  /** Account name OR code (matched case-insensitively against `accounts`). */
  account: string;
  /** For TRANSFER: destination account name/code. */
  targetAccount?: string;
  category?: string;
  date?: string; // YYYY-MM-DD; defaults to today
  currency?: string; // defaults to the touched account's currency
  exchangeRate?: number; // base conversion for non-IDR legs
}

export class UnknownAccountError extends Error {
  constructor(public readonly query: string) {
    super(`Unknown account "${query}". Register the account first via POST /api/v1/ledger/accounts.`);
    this.name = 'UnknownAccountError';
  }
}

export function resolveAccount(accounts: AccountDef[], query: string): AccountDef {
  const q = (query ?? '').trim().toLowerCase();
  const found = accounts.find((a) => a.code.toLowerCase() === q || a.name.toLowerCase() === q);
  if (!found) throw new UnknownAccountError(query);
  return found;
}

export function rateFor(currency: string, explicit?: number): number {
  if (explicit !== undefined && explicit > 0) return explicit;
  return DEFAULT_EXCHANGE_RATES[currency.toUpperCase()] ?? 1;
}

function leg(
  acc: AccountDef,
  signedAmount: number,
  currency: string,
  exchangeRate: number
): LedgerEntryInput {
  return { accountId: acc.code, amount: signedAmount, currency, exchangeRate };
}

/**
 * Maps a simple UX transaction to balanced double-entry legs against a CoA.
 * Rules:
 *  - INCOME          : Debit <account>, Credit 4000 (or 4100 for TRADING_PROFIT)
 *  - TRADING_PROFIT  : Debit <trading account>, Credit 4100 (base-currency legs)
 *  - EXPENSE         : Debit 5000 (category metadata), Credit <account>
 *  - TRANSFER        : Debit <target>, Credit <source>
 * Negative profit (trading loss) is an EXPENSE-style inversion: Debit 5000, Credit account.
 */
export function buildJournalLegs(
  tx: SimpleTransactionInput,
  accounts: AccountDef[]
): LedgerEntryInput[] {
  if (tx.amount === undefined || isNaN(tx.amount)) {
    throw new Error('Transaction amount must be a number.');
  }
  if (tx.type === 'TRADING_PROFIT') {
    if (tx.amount === 0) throw new Error('TRADING_PROFIT amount must be non-zero (loss = negative).');
  } else if (tx.amount <= 0) {
    throw new Error('Transaction amount must be a positive number (sign is derived from type).');
  }
  const account = resolveAccount(accounts, tx.account);
  const currency = (tx.currency ?? account.currency).toUpperCase();
  const rate = rateFor(currency, tx.exchangeRate);
  const amount = Math.abs(tx.amount);

  switch (tx.type) {
    case 'INCOME':
      return [
        leg(account, amount, currency, rate),
        leg(resolveAccount(accounts, COA.INCOME), -amount, currency, rate),
      ];
    case 'TRADING_PROFIT': {
      const incomeAcc = resolveAccount(accounts, COA.TRADING_INCOME);
      if (tx.amount < 0) {
        // Trading loss: expense side posted in base (IDR) so the journal balances in base currency.
        const expenseAcc = resolveAccount(accounts, COA.EXPENSE);
        return [
          { accountId: expenseAcc.code, amount: amount * rate, currency: 'IDR', exchangeRate: 1 },
          leg(account, -amount, currency, rate),
        ];
      }
      return [
        leg(account, amount, currency, rate),
        { accountId: incomeAcc.code, amount: -amount * rate, currency: 'IDR', exchangeRate: 1 },
      ];
    }
    case 'EXPENSE': {
      const expenseAcc = resolveAccount(accounts, COA.EXPENSE);
      return [leg(expenseAcc, amount, currency, rate), leg(account, -amount, currency, rate)];
    }
    case 'TRANSFER': {
      if (!tx.targetAccount) throw new Error('TRANSFER requires a targetAccount.');
      const target = resolveAccount(accounts, tx.targetAccount);
      // Legs are expressed in the SOURCE currency; FX conversion is the broker's/bank's job
      // at reconciliation time (RECONCILIATION source journals).
      const targetLeg =
        target.currency.toUpperCase() === account.currency.toUpperCase()
          ? leg(target, amount, currency, rate)
          : { accountId: target.code, amount, currency: account.currency.toUpperCase(), exchangeRate: rate };
      return [targetLeg, leg(account, -amount, currency, rate)];
    }
    default:
      throw new Error(`Unsupported transaction type "${tx.type}".`);
  }
}

export interface DraftJournal {
  description: string;
  date: string;
  source: SourceType;
  txType: TransactionType;
  category?: string;
  entries: LedgerEntryInput[];
  validation: JournalValidationResult;
}

/** Build a validated journal draft from a simple transaction (does NOT persist). */
export function buildDraftJournalFromTransaction(
  tx: SimpleTransactionInput,
  accounts: AccountDef[],
  source: SourceType = 'MANUAL'
): DraftJournal {
  const entries = buildJournalLegs(tx, accounts);
  return {
    description: tx.description,
    date: tx.date ?? new Date().toISOString().slice(0, 10),
    source,
    txType: tx.type,
    category: tx.category,
    entries,
    validation: validateJournalEntries(entries),
  };
}

/** MT5 / broker realized-P&L payloads map 1:1 onto trading profit/loss journals. */
export interface TradeProfitInput {
  account: string; // trading account name/code
  profit: number; // account currency, signed
  currency: string;
  exchangeRate?: number;
  description: string;
  date?: string;
}

export function tradeProfitToTransaction(p: TradeProfitInput): SimpleTransactionInput {
  return {
    amount: Math.abs(p.profit),
    type: 'TRADING_PROFIT',
    // negative magnitude signals a loss inside buildJournalLegs via tx.amount<0 branch:
    description: p.description,
    account: p.account,
    currency: p.currency,
    exchangeRate: p.exchangeRate,
    date: p.date,
  };
}
