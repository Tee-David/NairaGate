/** CBN NUBAN check-digit weights, applied to bankCode + the first 9 digits of accountNumber. */
const NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

/**
 * The CBN NUBAN check-digit algorithm only covers the standard 3-digit bank
 * code assigned to Nigeria's deposit money banks. Longer provider-specific
 * codes (fintechs, microfinance banks) don't follow this scheme, so callers
 * must only apply this when bankCode is exactly 3 digits.
 */
export function hasValidNubanCheckDigit(
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
