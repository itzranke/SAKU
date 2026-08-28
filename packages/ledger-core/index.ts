/**
 * SAKU Immutable Double-Entry Ledger Core
 * Enforces: Sum(Debits * Rate) - Sum(Credits * Rate) === 0
 */

export interface LedgerEntryInput {
  accountId: string;
  amount: number; // Positive = Debit, Negative = Credit
  currency: string;
  exchangeRate?: number;
}

export interface JournalValidationResult {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  imbalanceDelta: number;
  error?: string;
}

/**
 * Validates whether a proposed ledger journal is balanced across debits and credits.
 */
export function validateJournalEntries(entries: LedgerEntryInput[]): JournalValidationResult {
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
    } else {
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
