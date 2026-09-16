import { NairaGateError } from "./errors.js";
import type { ResolveAccountInput } from "./types.js";

const ACCOUNT_NUMBER = /^\d{10}$/;
const BANK_CODE = /^\d{2,6}$/;

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

  return { accountNumber, bankCode };
}
