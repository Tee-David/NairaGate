import { hasValidNubanCheckDigit } from "./nuban.js";
import type { Bank } from "./types.js";

const ACCOUNT_NUMBER = /^\d{10}$/;

/**
 * Suggests which of the given banks a 10-digit Nigerian account number could
 * belong to, purely from the account number's own CBN NUBAN check digit:
 * the same local, offline trick behind the "matched bank" suggestion in apps
 * like OPay. No network call is made; pass the bank list you already have
 * from a prior `banks.list()` call.
 *
 * Only banks whose `code` is exactly 3 digits (the standard deposit-money-bank
 * scheme the algorithm covers) are ever candidates; longer fintech/MFB codes
 * are skipped. More than one bank can share a matching check digit for the
 * same account number, so treat the result as candidates for the caller to
 * confirm, never as a resolved identity; `accounts.resolve` remains the
 * authoritative source for the actual account holder.
 *
 * Returns an empty array for anything that isn't a well-formed 10-digit
 * account number, rather than throwing, since callers typically run this on
 * every keystroke before the user has finished typing.
 */
export function guessBankCandidates(
  accountNumber: string,
  banks: readonly Bank[],
): Bank[] {
  if (!ACCOUNT_NUMBER.test(accountNumber)) return [];

  return banks
    .filter(
      (bank) =>
        bank.code.length === 3 &&
        hasValidNubanCheckDigit(accountNumber, bank.code),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
