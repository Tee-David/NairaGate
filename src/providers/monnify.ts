import { NairaGateError } from "../errors.js";
import type {
  Bank,
  BankProvider,
  FetchLike,
  ResolveAccountInput,
  ResolvedAccount,
} from "../types.js";
import { validateResolveAccountInput } from "../validation.js";

const DEFAULT_BASE_URL = "https://api.monnify.com";
const TOKEN_EXPIRY_BUFFER_MS = 30_000;

type MonnifyEnvelope = {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseBody?: unknown;
};

export type MonnifyProviderOptions = {
  apiKey: string;
  secretKey: string;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): MonnifyEnvelope | null {
  if (!isRecord(value) || typeof value.requestSuccessful !== "boolean")
    return null;
  return {
    requestSuccessful: value.requestSuccessful,
    ...(typeof value.responseMessage === "string"
      ? { responseMessage: value.responseMessage }
      : {}),
    ...(Object.hasOwn(value, "responseBody")
      ? { responseBody: value.responseBody }
      : {}),
  };
}

function parseAccessToken(
  value: unknown,
): { accessToken: string; expiresIn: number } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.accessToken !== "string" ||
    typeof value.expiresIn !== "number"
  )
    return null;
  return { accessToken: value.accessToken, expiresIn: value.expiresIn };
}

function parseBank(value: unknown): Bank | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.code !== "string"
  )
    return null;
  const name = value.name.trim();
  const code = value.code.trim();
  if (!name || !code) return null;
  return { name, code };
}

function parseResolvedAccount(
  value: unknown,
): { accountNumber: string; accountName: string } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.accountNumber !== "string" ||
    typeof value.accountName !== "string"
  )
    return null;
  const accountNumber = value.accountNumber.trim();
  const accountName = value.accountName.trim();
  if (!accountNumber || !accountName) return null;
  return { accountNumber, accountName };
}

export class MonnifyProvider implements BankProvider {
  readonly name = "monnify";
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(options: MonnifyProviderOptions) {
    if (!options.apiKey?.trim()) {
      throw new NairaGateError(
        "INVALID_INPUT",
        "A Monnify API key is required.",
        { provider: this.name },
      );
    }
    if (!options.secretKey?.trim()) {
      throw new NairaGateError(
        "INVALID_INPUT",
        "A Monnify secret key is required.",
        { provider: this.name },
      );
    }
    this.apiKey = options.apiKey.trim();
    this.secretKey = options.secretKey.trim();
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async listBanks(): Promise<Bank[]> {
    const payload = await this.request(
      { path: "/api/v1/sdk/transactions/banks", method: "GET" },
      "banks",
    );
    if (!Array.isArray(payload.responseBody)) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an invalid bank response.",
        { provider: this.name },
      );
    }

    const unique = new Map<string, Bank>();
    for (const value of payload.responseBody) {
      const bank = parseBank(value);
      if (bank && !unique.has(bank.code)) unique.set(bank.code, bank);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async resolveAccount(
    rawInput: ResolveAccountInput,
  ): Promise<ResolvedAccount> {
    const input = validateResolveAccountInput(rawInput);
    const params = new URLSearchParams({
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
    });
    const payload = await this.request(
      {
        path: `/api/v1/disbursements/account/validate?${params.toString()}`,
        method: "GET",
      },
      "account",
    );
    const account = parseResolvedAccount(payload.responseBody);
    if (!account) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an incomplete account response.",
        { provider: this.name },
      );
    }
    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankCode: input.bankCode,
    };
  }

  // Monnify's disbursement APIs sit behind a short-lived OAuth2 token rather
  // than a static secret, so it is fetched once and reused until it is close
  // to expiry instead of being exchanged on every call.
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${this.apiKey}:${this.secretKey}`)}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new NairaGateError("NETWORK_ERROR", "Could not reach Monnify.", {
        provider: this.name,
        cause,
      });
    }

    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch (cause) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an invalid authentication response.",
        { provider: this.name, status: response.status, cause },
      );
    }

    const payload = parseEnvelope(rawPayload);
    if (!payload || !response.ok || !payload.requestSuccessful) {
      const code =
        response.status === 401 || response.status === 403
          ? "AUTHENTICATION_FAILED"
          : response.status === 429
            ? "RATE_LIMITED"
            : "PROVIDER_ERROR";
      throw new NairaGateError(code, "Monnify authentication failed.", {
        provider: this.name,
        status: response.status,
      });
    }

    const token = parseAccessToken(payload.responseBody);
    if (!token) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an invalid authentication response.",
        { provider: this.name, status: response.status },
      );
    }

    this.cachedToken = {
      accessToken: token.accessToken,
      expiresAt: Date.now() + token.expiresIn * 1000 - TOKEN_EXPIRY_BUFFER_MS,
    };
    return this.cachedToken.accessToken;
  }

  private async request(
    init: { path: string; method: "GET" | "POST" },
    operation: "banks" | "account",
  ): Promise<MonnifyEnvelope> {
    const accessToken = await this.getAccessToken();

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${init.path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new NairaGateError("NETWORK_ERROR", "Could not reach Monnify.", {
        provider: this.name,
        cause,
      });
    }

    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch (cause) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an invalid response.",
        { provider: this.name, status: response.status, cause },
      );
    }

    const payload = parseEnvelope(rawPayload);
    if (!payload) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Monnify returned an invalid response.",
        { provider: this.name, status: response.status },
      );
    }

    if (!response.ok || !payload.requestSuccessful) {
      const code =
        response.status === 401 || response.status === 403
          ? "AUTHENTICATION_FAILED"
          : response.status === 429
            ? "RATE_LIMITED"
            : operation === "account" &&
                (response.status === 400 ||
                  response.status === 404 ||
                  response.status === 422)
              ? "ACCOUNT_NOT_FOUND"
              : "PROVIDER_ERROR";
      throw new NairaGateError(code, "Monnify request failed.", {
        provider: this.name,
        status: response.status,
      });
    }

    return payload;
  }
}
