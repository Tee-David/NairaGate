import { describe, expect, it, vi } from "vitest";
import { NairaGateError, PaystackProvider } from "../src/index.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PaystackProvider", () => {
  it("lists, de-duplicates, and sorts banks", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        status: true,
        message: "ok",
        data: [
          { name: "Zenith Bank", code: "057" },
          { name: "Access Bank", code: "044" },
          { name: "Access Duplicate", code: "044" },
        ],
      }),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher as typeof fetch });
    await expect(provider.listBanks()).resolves.toEqual([
      { name: "Access Duplicate", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ]);
  });

  it("encodes account-resolution query parameters", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ status: true, message: "ok", data: { account_number: "0123456789", account_name: "Test User" } }),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher as typeof fetch });
    await provider.resolveAccount({ accountNumber: "0123456789", bankCode: "058" });
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("account_number=0123456789&bank_code=058");
  });

  it("rejects invalid account numbers before a network request", async () => {
    const fetcher = vi.fn();
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher as typeof fetch });
    await expect(provider.resolveAccount({ accountNumber: "123", bankCode: "058" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps authentication failures to a typed error", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ status: false, message: "Invalid key" }, 401));
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher as typeof fetch });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(NairaGateError);
      expect(error).toMatchObject({ code: "AUTHENTICATION_FAILED", status: 401, provider: "paystack" });
    }
  });
});
