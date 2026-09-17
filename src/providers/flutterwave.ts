import { NairaGateError } from "../errors.js";
import type {
  Bank,
  BankProvider,
  FetchLike,
  ResolveAccountInput,
  ResolvedAccount,
} from "../types.js";
import { validateResolveAccountInput } from "../validation.js";

const DEFAULT_BASE_URL = "https://api.flutterwave.com/v3";
const COUNTRY_CODE = "NG";

type FlutterwaveEnvelope = {
  status: string;
  message?: string;
  data?: unknown;
};

export type FlutterwaveProviderOptions = {
  secretKey: string;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): FlutterwaveEnvelope | null {
  if (!isRecord(value) || typeof value.status !== "string") return null;
  return {
    status: value.status,
    ...(typeof value.message === "string" ? { message: value.message } : {}),
    ...(Object.hasOwn(value, "data") ? { data: value.data } : {}),
  };
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
  return {
    name,
    code,
    ...(typeof value.id === "number" ? { id: value.id } : {}),
  };
}

function parseResolvedAccount(
  value: unknown,
): { accountNumber: string; accountName: string } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.account_number !== "string" ||
    typeof value.account_name !== "string"
  )
    return null;
  const accountNumber = value.account_number.trim();
  const accountName = value.account_name.trim();
  if (!accountNumber || !accountName) return null;
  return { accountNumber, accountName };
}

export class FlutterwaveProvider implements BankProvider {
  readonly name = "flutterwave";
  private readonly secretKey: string;
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: FlutterwaveProviderOptions) {
    if (!options.secretKey?.trim()) {
      throw new NairaGateError(
        "INVALID_INPUT",
        "A Flutterwave secret key is required.",
        { provider: this.name },
      );
    }
    this.secretKey = options.secretKey.trim();
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async listBanks(): Promise<Bank[]> {
    const payload = await this.request(
      { path: `/banks/${COUNTRY_CODE}`, method: "GET" },
      "banks",
    );
    if (!Array.isArray(payload.data)) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Flutterwave returned an invalid bank response.",
        { provider: this.name },
      );
    }

    const unique = new Map<string, Bank>();
    for (const value of payload.data) {
      const bank = parseBank(value);
      if (bank && !unique.has(bank.code)) unique.set(bank.code, bank);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async resolveAccount(
    rawInput: ResolveAccountInput,
  ): Promise<ResolvedAccount> {
    const input = validateResolveAccountInput(rawInput);
    const payload = await this.request(
      {
        path: "/accounts/resolve",
        method: "POST",
        body: {
          account_number: input.accountNumber,
          account_bank: input.bankCode,
        },
      },
      "account",
    );
    const account = parseResolvedAccount(payload.data);
    if (!account) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Flutterwave returned an incomplete account response.",
        { provider: this.name },
      );
    }
    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankCode: input.bankCode,
    };
  }

  private async request(
    init: { path: string; method: "GET" | "POST"; body?: unknown },
    operation: "banks" | "account",
  ): Promise<FlutterwaveEnvelope> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${init.path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new NairaGateError(
        "NETWORK_ERROR",
        "Could not reach Flutterwave.",
        { provider: this.name, cause },
      );
    }

    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch (cause) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Flutterwave returned an invalid response.",
        { provider: this.name, status: response.status, cause },
      );
    }

    const payload = parseEnvelope(rawPayload);
    if (!payload) {
      throw new NairaGateError(
        "PROVIDER_ERROR",
        "Flutterwave returned an invalid response.",
        { provider: this.name, status: response.status },
      );
    }

    if (!response.ok || payload.status !== "success") {
      const code =
        response.status === 401 || response.status === 403
          ? "AUTHENTICATION_FAILED"
          : response.status === 429
            ? "RATE_LIMITED"
            : operation === "account" &&
                (response.status === 200 ||
                  response.status === 400 ||
                  response.status === 404 ||
                  response.status === 422)
              ? "ACCOUNT_NOT_FOUND"
              : "PROVIDER_ERROR";
      throw new NairaGateError(code, "Flutterwave request failed.", {
        provider: this.name,
        status: response.status,
      });
    }

    return payload;
  }
}
