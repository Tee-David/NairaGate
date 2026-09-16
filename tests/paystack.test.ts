import { describe, expect, it, vi } from "vitest";
import { NairaGateError, PaystackProvider } from "../src/index.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PaystackProvider", () => {
  it("requires a secret key", () => {
    expect(() => new PaystackProvider({ secretKey: "" })).toThrowError(NairaGateError);
  });

  it("lists, de-duplicates, and sorts banks", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          status: true,
          message: "ok",
          data: [
            { name: "Zenith Bank", code: "057" },
            { name: "Access Bank", code: "044" },
            { name: "Access Duplicate", code: "044" },
          ],
        }),
      ),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(provider.listBanks()).resolves.toEqual([
      { name: "Access Duplicate", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ]);
  });

  it("resolves and normalizes an account", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          status: true,
          message: "ok",
          data: { account_number: "0123456789", account_name: "Test User" },
        }),
      ),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(
      provider.resolveAccount({ accountNumber: "0123456789", bankCode: "058" }),
    ).resolves.toEqual({
      accountNumber: "0123456789",
      accountName: "Test User",
      bankCode: "058",
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "account_number=0123456789&bank_code=058",
    );
  });

  it("rejects invalid input before a network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(
      provider.resolveAccount({ accountNumber: "123", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AUTHENTICATION_FAILED"],
    [404, "ACCOUNT_NOT_FOUND"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %i to %s", async (status, code) => {
    const fetcher = vi.fn(() =>
      Promise.resolve(jsonResponse({ status: false, message: "request failed" }, status)),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code,
      status,
      provider: "paystack",
    });
  });

  it("normalizes malformed provider responses", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response("not-json", { status: 502 })));
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("normalizes network failures without leaking the secret", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("socket unavailable")));
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toMatchObject({ code: "NETWORK_ERROR", provider: "paystack" });
      expect(String(error)).not.toContain("sk_test_example");
    }
  });

  it("rejects incomplete successful account payloads", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          status: true,
          message: "ok",
          data: { account_number: "0123456789" },
        }),
      ),
    );
    const provider = new PaystackProvider({ secretKey: "sk_test_example", fetch: fetcher });
    await expect(
      provider.resolveAccount({ accountNumber: "0123456789", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
