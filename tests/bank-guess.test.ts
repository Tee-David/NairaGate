import { describe, expect, it } from "vitest";
import { guessBankCandidates } from "../src/index.js";
import type { Bank } from "../src/index.js";

const BANKS: Bank[] = [
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Access Bank", code: "044" },
  { name: "Zenith Bank", code: "057" },
  { name: "Sterling Bank", code: "232" },
  { name: "Some Fintech MFB", code: "50515" },
];

describe("guessBankCandidates", () => {
  it("returns only the bank whose NUBAN check digit matches the account number", () => {
    expect(guessBankCandidates("0123456785", BANKS)).toEqual([
      { name: "Guaranty Trust Bank", code: "058" },
    ]);
  });

  it("returns an empty array when no bank's 3-digit code matches", () => {
    expect(guessBankCandidates("0123456789", BANKS)).toEqual([]);
  });

  it("never returns a bank whose code isn't exactly 3 digits, even for matching digits", () => {
    const candidates = guessBankCandidates("0123456785", BANKS);
    expect(candidates.some((bank) => bank.code === "50515")).toBe(false);
  });

  it("sorts multiple matches by name", () => {
    const collidingBanks: Bank[] = [
      { name: "Zenith Bank", code: "058" },
      { name: "Access Bank", code: "058" },
    ];
    expect(guessBankCandidates("0123456785", collidingBanks)).toEqual([
      { name: "Access Bank", code: "058" },
      { name: "Zenith Bank", code: "058" },
    ]);
  });

  it.each(["", "123", "01234567890", "0123456abc"])(
    "returns an empty array instead of throwing for malformed input: %s",
    (accountNumber) => {
      expect(guessBankCandidates(accountNumber, BANKS)).toEqual([]);
    },
  );

  it("returns an empty array for an empty bank list", () => {
    expect(guessBankCandidates("0123456785", [])).toEqual([]);
  });
});
