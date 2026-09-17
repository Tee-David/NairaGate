import { describe, expect, it, vi } from "vitest";
import { FlutterwaveProvider, NairaGateError } from "../src/index.js";
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

describe("FlutterwaveProvider", () => {
  it("requires a non-empty secret key", () => {
    expect(() => new FlutterwaveProvider({ secretKey: "   " })).toThrowError(
      NairaGateError,
    );
  });

  it("lists, de-duplicates, ignores malformed entries, and sorts banks", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: "success",
        message: "Banks retrieved",
        data: [
          { id: 76, name: "Zenith Bank", code: "057" },
          { id: 1, name: "Access Bank", code: "044" },
          { id: 2, name: "Access Duplicate", code: "044" },
          { name: "Missing code" },
          null,
        ],
      }),
    );
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).resolves.toEqual([
      { id: 1, name: "Access Bank", code: "044" },
      { id: 76, name: "Zenith Bank", code: "057" },
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("https://api.flutterwave.com/v3/banks/NG");
  });

  it("sends the expected authorization header and resolves an account", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: "success",
        message: "Account details fetched",
        data: { account_number: "0690000032", account_name: "Test User" },
      }),
    );
    const provider = new FlutterwaveProvider({
      secretKey: " FLWSECK_TEST-example ",
      fetch: fetcher,
      baseUrl: "https://example.test/v3",
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0690000032", bankCode: "044" }),
    ).resolves.toEqual({
      accountNumber: "0690000032",
      accountName: "Test User",
      bankCode: "044",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("https://example.test/v3/accounts/resolve");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer FLWSECK_TEST-example",
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({ account_number: "0690000032", account_bank: "044" }),
    );
  });

  it("rejects invalid input before a network request", async () => {
    const fetcher = vi.fn<FetchLike>();
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "123", bankCode: "044" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      provider.resolveAccount({ accountNumber: "0690000032", bankCode: "x" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AUTHENTICATION_FAILED"],
    [403, "AUTHENTICATION_FAILED"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps bank-list HTTP %i to %s", async (status, code) => {
    const fetcher = mockFetch(
      jsonResponse({ status: "error", message: "failed" }, status),
    );
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code,
      status,
      provider: "flutterwave",
    });
  });

  it.each([200, 400, 404, 422] as const)(
    "maps account HTTP %i with an error envelope to ACCOUNT_NOT_FOUND",
    async (status) => {
      const fetcher = mockFetch(
        jsonResponse({ status: "error", message: "No Account found" }, status),
      );
      const provider = new FlutterwaveProvider({
        secretKey: "FLWSECK_TEST-example",
        fetch: fetcher,
      });
      await expect(
        provider.resolveAccount({
          accountNumber: "0690000032",
          bankCode: "044",
        }),
      ).rejects.toMatchObject({
        code: "ACCOUNT_NOT_FOUND",
        status,
        message: "Flutterwave request failed.",
      });
    },
  );

  it("does not classify a bank-list error envelope as an account lookup failure", async () => {
    const fetcher = mockFetch(
      jsonResponse({ status: "error", message: "failed" }, 400),
    );
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 400,
    });
  });

  it("rejects a successful envelope with malformed bank data", async () => {
    const fetcher = mockFetch(jsonResponse({ status: "success", data: {} }));
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("normalizes malformed JSON responses", async () => {
    const fetcher = mockFetch(new Response("not-json", { status: 502 }));
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("rejects malformed envelopes", async () => {
    const fetcher = mockFetch(jsonResponse({ data: [] }));
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
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
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toMatchObject({
        code: "NETWORK_ERROR",
        provider: "flutterwave",
      });
      expect(String(error)).not.toContain("FLWSECK_TEST-example");
    }
  });

  it("rejects incomplete successful account payloads", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: "success",
        data: { account_number: "0690000032" },
      }),
    );
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0690000032", bankCode: "044" }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
