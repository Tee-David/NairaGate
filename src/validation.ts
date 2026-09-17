import { NairaGateError } from "./errors.js";
import type { ResolveAccountInput } from "./types.js";

const ACCOUNT_NUMBER = /^\d{10}$/;
const BANK_CODE = /^\d{2,6}$/;

/** CBN NUBAN check-digit weights, applied to bankCode + the first 9 digits of accountNumber. */
const NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

/**
 * The CBN NUBAN check-digit algorithm only covers the standard 3-digit bank
 * code assigned to Nigeria's deposit money banks. Longer provider-specific
 * codes (fintechs, microfinance banks) don't follow this scheme, so this is
 * only ever checked when bankCode is exactly 3 digits.
 */
function hasValidNubanCheckDigit(
  accountNumber: string,
  bankCode: string,
): boolean {
  const cipher = `${bankCode}${accountNumber.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < NUBAN_WEIGHTS.length; i++) {
    sum += Number(cipher[i]) * NUBAN_WEIGHTS[i]!;
  }
  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  return checkDigit === Number(accountNumber[9]);
}

export function validateResolveAccountInput(
  input: ResolveAccountInput,
): ResolveAccountInput {
  const accountNumber = input.accountNumber.trim();
  const bankCode = input.bankCode.trim();

  if (!ACCOUNT_NUMBER.test(accountNumber)) {
    throw new NairaGateError(
      "INVALID_INPUT",
      "accountNumber must contain exactly 10 digits.",
    );
  }

  if (!BANK_CODE.test(bankCode)) {
    throw new NairaGateError(
      "INVALID_INPUT",
      "bankCode must contain between 2 and 6 digits.",
    );
  }

  if (
    bankCode.length === 3 &&
    !hasValidNubanCheckDigit(accountNumber, bankCode)
  ) {
    throw new NairaGateError(
      "INVALID_INPUT",
      "accountNumber fails the NUBAN check digit for this bank code.",
    );
  }

  return { accountNumber, bankCode };
}
