import { describe, expect, it, vi } from "vitest";
import { KorapayProvider, NairaGateError } from "../src/index.js";
import type { FetchLike } from "../src/index.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(response: Response): FetchLike {
  return vi.fn<FetchLike>(() => Promise.resolve(response));
}

describe("KorapayProvider", () => {
  it("requires a non-empty secret key", () => {
    expect(() => new KorapayProvider({ secretKey: "   " })).toThrowError(
      NairaGateError,
    );
  });

  it("lists, de-duplicates, ignores malformed entries, and sorts banks", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: true,
        message: "Banks retrieved",
        data: [
          { name: "Zenith Bank", code: "057" },
          { name: "Access Bank", code: "044" },
          { name: "Access Duplicate", code: "044" },
          { name: "Missing code" },
          null,
        ],
      }),
    );
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).resolves.toEqual([
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.korapay.com/merchant/api/v1/misc/banks?countryCode=NG",
    );
  });

  it("sends the expected authorization header and resolves an account", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: true,
        message: "Account resolved",
        data: {
          account_number: "0234247896",
          account_name: "Test User",
          bank_code: "058",
          bank_name: "GTBank Plc",
        },
      }),
    );
    const provider = new KorapayProvider({
      secretKey: " sk_test_example ",
      fetch: fetcher,
      baseUrl: "https://example.test/v1",
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0234247896", bankCode: "058" }),
    ).resolves.toEqual({
      accountNumber: "0234247896",
      accountName: "Test User",
      bankCode: "058",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("https://example.test/v1/misc/banks/resolve");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer sk_test_example",
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({ bank_code: "058", account_number: "0234247896" }),
    );
  });

  it("rejects invalid input before a network request", async () => {
    const fetcher = vi.fn<FetchLike>();
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "123", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      provider.resolveAccount({ accountNumber: "0234247896", bankCode: "x" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AUTHENTICATION_FAILED"],
    [403, "AUTHENTICATION_FAILED"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps bank-list HTTP %i to %s", async (status, code) => {
    const fetcher = mockFetch(jsonResponse({ status: false }, status));
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code,
      status,
      provider: "korapay",
    });
  });

  it.each([400, 404, 422] as const)(
    "maps account HTTP %i to ACCOUNT_NOT_FOUND",
    async (status) => {
      const fetcher = mockFetch(
        jsonResponse(
          { status: false, message: "Unable to resolve bank account" },
          status,
        ),
      );
      const provider = new KorapayProvider({
        secretKey: "sk_test_example",
        fetch: fetcher,
      });
      await expect(
        provider.resolveAccount({
          accountNumber: "0234247896",
          bankCode: "058",
        }),
      ).rejects.toMatchObject({
        code: "ACCOUNT_NOT_FOUND",
        status,
        message: "Korapay request failed.",
      });
    },
  );

  it("does not classify a bank-list 404 as an account lookup failure", async () => {
    const fetcher = mockFetch(jsonResponse({ status: false }, 404));
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 404,
    });
  });

  it("rejects a successful envelope with malformed bank data", async () => {
    const fetcher = mockFetch(jsonResponse({ status: true, data: {} }));
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("normalizes malformed JSON responses", async () => {
    const fetcher = mockFetch(new Response("not-json", { status: 502 }));
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("rejects malformed envelopes", async () => {
    const fetcher = mockFetch(jsonResponse({ data: [] }));
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("normalizes network failures without leaking the secret", async () => {
    const fetcher = vi.fn<FetchLike>(() =>
      Promise.reject(new Error("socket unavailable")),
    );
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toMatchObject({
        code: "NETWORK_ERROR",
        provider: "korapay",
      });
      expect(String(error)).not.toContain("sk_test_example");
    }
  });

  it("rejects incomplete successful account payloads", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: true,
        data: { account_number: "0234247896" },
      }),
    );
    const provider = new KorapayProvider({
      secretKey: "sk_test_example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0234247896", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
