import { afterEach, describe, expect, it, vi } from "vitest";
import { MonnifyProvider, NairaGateError } from "../src/index.js";
import type { FetchLike } from "../src/index.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function loginResponse(expiresIn = 3600, accessToken = "token-1") {
  return jsonResponse({
    requestSuccessful: true,
    responseMessage: "success",
    responseCode: "0",
    responseBody: { accessToken, expiresIn },
  });
}

function sequenceFetch(responses: Response[]): FetchLike {
  const fn = vi.fn<FetchLike>();
  for (const response of responses) {
    fn.mockResolvedValueOnce(response);
  }
  return fn;
}

describe("MonnifyProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a non-empty API key", () => {
    expect(
      () => new MonnifyProvider({ apiKey: "   ", secretKey: "secret" }),
    ).toThrowError(NairaGateError);
  });

  it("requires a non-empty secret key", () => {
    expect(
      () => new MonnifyProvider({ apiKey: "MK_TEST_KEY", secretKey: "   " }),
    ).toThrowError(NairaGateError);
  });

  it("authenticates, then lists, de-duplicates, and sorts banks", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({
        requestSuccessful: true,
        responseBody: [
          { name: "Zenith Bank", code: "057" },
          { name: "Access Bank", code: "044" },
          { name: "Access Duplicate", code: "044" },
          { name: "Missing code" },
          null,
        ],
      }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).resolves.toEqual([
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank", code: "057" },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [loginUrl, loginInit] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(loginUrl).toBe("https://api.monnify.com/api/v1/auth/login");
    expect(loginInit?.headers).toMatchObject({
      Authorization: `Basic ${btoa("MK_TEST_KEY:secret")}`,
    });
    const [banksUrl, banksInit] = vi.mocked(fetcher).mock.calls[1] ?? [];
    expect(banksUrl).toBe(
      "https://api.monnify.com/api/v1/sdk/transactions/banks",
    );
    expect(banksInit?.headers).toMatchObject({
      Authorization: "Bearer token-1",
    });
  });

  it("reuses a cached access token across calls within its lifetime", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({ requestSuccessful: true, responseBody: [] }),
      jsonResponse({ requestSuccessful: true, responseBody: [] }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await provider.listBanks();
    await provider.listBanks();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("re-authenticates after the cached token expires", async () => {
    vi.useFakeTimers();
    const fetcher = sequenceFetch([
      loginResponse(60),
      jsonResponse({ requestSuccessful: true, responseBody: [] }),
      loginResponse(60, "token-2"),
      jsonResponse({ requestSuccessful: true, responseBody: [] }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await provider.listBanks();
    vi.advanceTimersByTime(61_000);
    await provider.listBanks();
    expect(fetcher).toHaveBeenCalledTimes(4);
    const [, secondBanksInit] = vi.mocked(fetcher).mock.calls[3] ?? [];
    expect(secondBanksInit?.headers).toMatchObject({
      Authorization: "Bearer token-2",
    });
  });

  it("sends validated query params and resolves an account", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({
        requestSuccessful: true,
        responseBody: {
          accountNumber: "0068687503",
          accountName: "Test User",
          bankCode: "232",
        },
      }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
      baseUrl: "https://example.test",
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0068687503", bankCode: "232" }),
    ).resolves.toEqual({
      accountNumber: "0068687503",
      accountName: "Test User",
      bankCode: "232",
    });
    const [url] = vi.mocked(fetcher).mock.calls[1] ?? [];
    expect(url).toBe(
      "https://example.test/api/v1/disbursements/account/validate?accountNumber=0068687503&bankCode=232",
    );
  });

  it("rejects invalid input before any network request", async () => {
    const fetcher = vi.fn<FetchLike>();
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "123", bankCode: "232" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps a login failure to AUTHENTICATION_FAILED without calling the data endpoint", async () => {
    const fetcher = sequenceFetch([
      jsonResponse({ requestSuccessful: false }, 401),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
      status: 401,
      provider: "monnify",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "AUTHENTICATION_FAILED"],
    [403, "AUTHENTICATION_FAILED"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps bank-list HTTP %i to %s", async (status, code) => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({ requestSuccessful: false }, status),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code,
      status,
      provider: "monnify",
    });
  });

  it.each([400, 404, 422] as const)(
    "maps account HTTP %i to ACCOUNT_NOT_FOUND",
    async (status) => {
      const fetcher = sequenceFetch([
        loginResponse(),
        jsonResponse({ requestSuccessful: false }, status),
      ]);
      const provider = new MonnifyProvider({
        apiKey: "MK_TEST_KEY",
        secretKey: "secret",
        fetch: fetcher,
      });
      await expect(
        provider.resolveAccount({
          accountNumber: "0068687503",
          bankCode: "232",
        }),
      ).rejects.toMatchObject({
        code: "ACCOUNT_NOT_FOUND",
        status,
        message: "Monnify request failed.",
      });
    },
  );

  it("normalizes malformed JSON responses from the data endpoint", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      new Response("not-json", { status: 502 }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("rejects malformed envelopes from the data endpoint", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({ responseBody: [] }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(provider.listBanks()).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("normalizes network failures during login without leaking the secret", async () => {
    const fetcher = vi.fn<FetchLike>(() =>
      Promise.reject(new Error("socket unavailable")),
    );
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "very_secret_value",
      fetch: fetcher,
    });
    try {
      await provider.listBanks();
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toMatchObject({
        code: "NETWORK_ERROR",
        provider: "monnify",
      });
      expect(String(error)).not.toContain("very_secret_value");
    }
  });

  it("rejects incomplete successful account payloads", async () => {
    const fetcher = sequenceFetch([
      loginResponse(),
      jsonResponse({
        requestSuccessful: true,
        responseBody: { accountNumber: "0068687503" },
      }),
    ]);
    const provider = new MonnifyProvider({
      apiKey: "MK_TEST_KEY",
      secretKey: "secret",
      fetch: fetcher,
    });
    await expect(
      provider.resolveAccount({ accountNumber: "0068687503", bankCode: "232" }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
