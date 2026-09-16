import { NairaGateError } from "../errors.js";
import type { Bank, BankProvider, FetchLike, ResolveAccountInput, ResolvedAccount } from "../types.js";
import { validateResolveAccountInput } from "../validation.js";

const DEFAULT_BASE_URL = "https://api.paystack.co";

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data?: T;
};

type PaystackBank = {
  id?: number;
  name: string;
  code: string;
  slug?: string;
  country?: string;
  currency?: string;
  active?: boolean;
};

type PaystackResolvedAccount = {
  account_number: string;
  account_name: string;
};

export type PaystackProviderOptions = {
  secretKey: string;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
};

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
    this.secretKey = options.secretKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async listBanks(): Promise<Bank[]> {
    const payload = await this.request<PaystackBank[]>("/bank?country=nigeria&perPage=200");
    const banks = payload.data ?? [];
    const unique = new Map<string, Bank>();
    for (const bank of banks) {
      if (!bank.name || !bank.code) continue;
      unique.set(bank.code, { ...bank });
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async resolveAccount(rawInput: ResolveAccountInput): Promise<ResolvedAccount> {
    const input = validateResolveAccountInput(rawInput);
    const params = new URLSearchParams({
      account_number: input.accountNumber,
      bank_code: input.bankCode,
    });
    const payload = await this.request<PaystackResolvedAccount>(`/bank/resolve?${params.toString()}`);
    if (!payload.data?.account_name || !payload.data.account_number) {
      throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an incomplete account response.", {
        provider: this.name,
      });
    }
    return {
      accountNumber: payload.data.account_number,
      accountName: payload.data.account_name,
      bankCode: input.bankCode,
    };
  }

  private async request<T>(path: string): Promise<PaystackEnvelope<T>> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${this.secretKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new NairaGateError("NETWORK_ERROR", "Could not reach Paystack.", { provider: this.name, cause });
    }

    let payload: PaystackEnvelope<T>;
    try {
      payload = (await response.json()) as PaystackEnvelope<T>;
    } catch (cause) {
      throw new NairaGateError("PROVIDER_ERROR", "Paystack returned an invalid response.", {
        provider: this.name,
        status: response.status,
        cause,
      });
    }

    if (!response.ok || !payload.status) {
      const code = response.status === 401 ? "AUTHENTICATION_FAILED" : response.status === 429 ? "RATE_LIMITED" : response.status === 404 ? "ACCOUNT_NOT_FOUND" : "PROVIDER_ERROR";
      throw new NairaGateError(code, payload.message || "Paystack request failed.", {
        provider: this.name,
        status: response.status,
      });
    }

    return payload;
  }
}
