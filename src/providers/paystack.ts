import { NairaGateError } from "../errors.js";
import type { Bank, BankProvider, FetchLike, ResolveAccountInput, ResolvedAccount } from "../types.js";
import { validateResolveAccountInput } from "../validation.js";

const DEFAULT_BASE_URL = "https://api.paystack.co";
const BANK_PAGE_SIZE = 100;

type PaystackEnvelope = {
  status: boolean;
  data?: unknown;
  meta?: unknown;
};

export type PaystackProviderOptions = {
  secretKey: string;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): PaystackEnvelope | null {
  if (!isRecord(value) || typeof value.status !== "boolean") return null;
  return {
    status: value.status,
    ...(Object.hasOwn(value, "data") ? { data: value.data } : {}),
    ...(Object.hasOwn(value, "meta") ? { meta: value.meta } : {}),
  };
}

function parseNextCursor(meta: unknown): string | null {
  if (!isRecord(meta)) return null;
  return typeof meta.next === "string" && meta.next.length > 0 ? meta.next : null;
}

function parseBank(value: unknown): Bank | null {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.code !== "string") return null;
  const name = value.name.trim();
  const code = value.code.trim();
  if (!name || !code) return null;
  return { name, code };
}

function parseResolvedAccount(value: unknown): { accountNumber: string; accountName: string } | null {
  if (!isRecord(value)) return null;
  if (typeof value.account_number !== "string" || typeof value.account_name !== "string") return null;
  const accountNumber = value.account_number.trim();
  const accountName = value.account_name.trim();
  if (!accountNumber || !accountName) return null;
  return { accountNumber, accountName };
}

export class PaystackProvider implements BankProvider {
  readonly name = "paystack";
  private readonly secretKey: string;
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: PaystackProviderOptions) {
    if (!options.secretKey?.trim()) {
      throw new NairaGateError("INVALID_INPUT", "A Paystack secret key is required.", { provider: this.name });
    }
    this.secretKey = options.secretKey.trim();
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async listBanks(): Promise<Bank[]> {
    const unique = new Map<string, Bank>();
    let next: string | null = null;

    do {
      const params = new URLSearchParams({
        country: "nigeria",
        use_cursor: "true",
        perPage: String(BANK_PAGE_SIZE),
      });
      if (next) params.set("next", next);

      const payload = await this.request(`/bank?${params.toString()}`, "banks");
      if (!Array.isArray(payload.data)) {
        throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an invalid bank response.", {
          provider: this.name,
        });
      }

      for (const value of payload.data) {
        const bank = parseBank(value);
        if (bank && !unique.has(bank.code)) unique.set(bank.code, bank);
      }
      next = parseNextCursor(payload.meta);
    } while (next);

    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async resolveAccount(rawInput: ResolveAccountInput): Promise<ResolvedAccount> {
    const input = validateResolveAccountInput(rawInput);
    const params = new URLSearchParams({
      account_number: input.accountNumber,
      bank_code: input.bankCode,
    });
    const payload = await this.request(`/bank/resolve?${params.toString()}`, "account");
    const account = parseResolvedAccount(payload.data);
    if (!account) {
      throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an incomplete account response.", {
        provider: this.name,
      });
    }
    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankCode: input.bankCode,
    };
  }

  private async request(path: string, operation: "banks" | "account"): Promise<PaystackEnvelope> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${this.secretKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new NairaGateError("NETWORK_ERROR", "Could not reach Paystack.", { provider: this.name, cause });
    }

    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch (cause) {
      throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an invalid response.", {
        provider: this.name,
        status: response.status,
        cause,
      });
    }

    const payload = parseEnvelope(rawPayload);
    if (!payload) {
      throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an invalid response.", {
        provider: this.name,
        status: response.status,
      });
    }

    if (!response.ok || !payload.status) {
      const code =
        response.status === 401 || response.status === 403
          ? "AUTHENTICATION_FAILED"
          : response.status === 429
            ? "RATE_LIMITED"
            : operation === "account" && (response.status === 400 || response.status === 404 || response.status === 422)
              ? "ACCOUNT_NOT_FOUND"
              : "PROVIDER_ERROR";
      throw new NairaGateError(code, "Paystack request failed.", {
        provider: this.name,
        status: response.status,
      });
    }

    return payload;
  }
}
