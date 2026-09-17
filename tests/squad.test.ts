import { describe, expect, it, vi } from "vitest";
import { NairaGateError, SquadProvider } from "../src/index.js";
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

describe("SquadProvider", () => {
  it("requires a non-empty secret key", () => {
    expect(() => new SquadProvider({ secretKey: "   " })).toThrowError(
      NairaGateError,
    );
  });

  it("lists, de-duplicates, ignores malformed entries, and sorts banks", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: 200,
        success: true,
        message: "Success",
        data: [
          { bank_name: "Zenith Bank", bank_code: "057" },
          { name: "Access Bank", code: "044" },
          { name: "Access Duplicate", code: "044" },
          { name: "Missing code" },
          null,
        ],
      }),
    );
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).resolves.toEqual([
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("https://api-d.squadco.com/transaction/ussd/banklist");
  });

  it("sends the expected authorization header and resolves an account", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: 200,
        success: true,
        message: "Success",
        data: { account_name: "JENNY SQUAD", account_number: "0123456785" },
      }),
    );
    const provider = new SquadProvider({
      secretKey: " sandbox_sk_example ",
      fetch: fetcher,
      baseUrl: "https://example.test",
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0123456785", bankCode: "058" }),
    ).resolves.toEqual({
      accountNumber: "0123456785",
      accountName: "JENNY SQUAD",
      bankCode: "058",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("https://example.test/payout/account/lookup");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer sandbox_sk_example",
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({ bank_code: "058", account_number: "0123456785" }),
    );
  });

  it("rejects invalid input before a network request", async () => {
    const fetcher = vi.fn<FetchLike>();
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "123", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      provider.resolveAccount({ accountNumber: "0123456785", bankCode: "x" }),
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
      jsonResponse({ status, success: false, message: "failed" }, status),
    );
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code,
      status,
      provider: "squad",
    });
  });

  it.each([400, 404, 422] as const)(
    "maps account HTTP %i to ACCOUNT_NOT_FOUND",
    async (status) => {
      const fetcher = mockFetch(
        jsonResponse(
          { status, success: false, message: "Account not found" },
          status,
        ),
      );
      const provider = new SquadProvider({
        secretKey: "sandbox_sk_example",
        fetch: fetcher,
      });
      await expect(
        provider.resolveAccount({
          accountNumber: "0123456785",
          bankCode: "058",
        }),
      ).rejects.toMatchObject({
        code: "ACCOUNT_NOT_FOUND",
        status,
        message: "Squad request failed.",
      });
    },
  );

  it("does not classify a bank-list 404 as an account lookup failure", async () => {
    const fetcher = mockFetch(
      jsonResponse({ status: 404, success: false }, 404),
    );
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 404,
    });
  });

  it("rejects a successful envelope with malformed bank data", async () => {
    const fetcher = mockFetch(
      jsonResponse({ status: 200, success: true, data: {} }),
    );
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("normalizes malformed JSON responses", async () => {
    const fetcher = mockFetch(new Response("not-json", { status: 502 }));
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("rejects malformed envelopes", async () => {
    const fetcher = mockFetch(jsonResponse({ data: [] }));
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
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
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toMatchObject({
        code: "NETWORK_ERROR",
        provider: "squad",
      });
      expect(String(error)).not.toContain("sandbox_sk_example");
    }
  });

  it("rejects incomplete successful account payloads", async () => {
    const fetcher = mockFetch(
      jsonResponse({
        status: 200,
        success: true,
        data: { account_number: "0123456785" },
      }),
    );
    const provider = new SquadProvider({
      secretKey: "sandbox_sk_example",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0123456785", bankCode: "058" }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
