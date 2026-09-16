import { describe, expect, it } from "vitest";
import { NairaGateError } from "../src/errors.js";
import { validateResolveAccountInput } from "../src/validation.js";

describe("validateResolveAccountInput", () => {
  it("normalizes surrounding whitespace", () => {
    expect(validateResolveAccountInput({ accountNumber: " 0123456789 ", bankCode: " 058 " })).toEqual({
      accountNumber: "0123456789",
      bankCode: "058",
    });
  });

  for (const accountNumber of ["", "123", "01234567890", "01234abc89"]) {
    it(`rejects invalid account number: ${JSON.stringify(accountNumber)}`, () => {
      expect(() => validateResolveAccountInput({ accountNumber, bankCode: "058" })).toThrow(NairaGateError);
    });
  }

  for (const bankCode of ["", "1", "1234567", "ab"]) {
    it(`rejects invalid bank code: ${JSON.stringify(bankCode)}`, () => {
      expect(() => validateResolveAccountInput({ accountNumber: "0123456789", bankCode })).toThrow(NairaGateError);
    });
  }
});
