import { describe, expect, it } from "vitest";
import { NairaGateError } from "../src/errors.js";
import { validateResolveAccountInput } from "../src/validation.js";

describe("validateResolveAccountInput", () => {
  it("normalizes surrounding whitespace", () => {
    expect(
      validateResolveAccountInput({
        accountNumber: " 0123456785 ",
        bankCode: " 058 ",
      }),
    ).toEqual({
      accountNumber: "0123456785",
      bankCode: "058",
    });
  });

  for (const accountNumber of ["", "123", "01234567850", "01234abc89"]) {
    it(`rejects invalid account number: ${JSON.stringify(accountNumber)}`, () => {
      expect(() =>
        validateResolveAccountInput({ accountNumber, bankCode: "058" }),
      ).toThrow(NairaGateError);
    });
  }

  for (const bankCode of ["", "1", "1234567", "ab"]) {
    it(`rejects invalid bank code: ${JSON.stringify(bankCode)}`, () => {
      expect(() =>
        validateResolveAccountInput({ accountNumber: "0123456785", bankCode }),
      ).toThrow(NairaGateError);
    });
  }

  it("accepts an account number whose NUBAN check digit matches its 3-digit bank code", () => {
    expect(
      validateResolveAccountInput({
        accountNumber: "0123456785",
        bankCode: "058",
      }),
    ).toEqual({ accountNumber: "0123456785", bankCode: "058" });
  });

  it("rejects an account number whose NUBAN check digit does not match its 3-digit bank code", () => {
    expect(() =>
      validateResolveAccountInput({
        accountNumber: "0123456789",
        bankCode: "058",
      }),
    ).toThrow(NairaGateError);
  });

  it("skips the NUBAN check digit for bank codes that are not exactly 3 digits", () => {
    // Same digits that fail the check above, paired with a longer
    // fintech/MFB-style code the CBN algorithm doesn't cover.
    expect(
      validateResolveAccountInput({
        accountNumber: "0123456789",
        bankCode: "10001",
      }),
    ).toEqual({ accountNumber: "0123456789", bankCode: "10001" });
  });
});
