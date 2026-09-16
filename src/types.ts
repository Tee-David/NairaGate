export type Bank = {
  id?: number;
  name: string;
  code: string;
  slug?: string;
  country?: string;
  currency?: string;
  active?: boolean;
};

export type ResolveAccountInput = {
  accountNumber: string;
  bankCode: string;
};

export type ResolvedAccount = {
  accountNumber: string;
  accountName: string;
  bankCode: string;
};

export interface BankProvider {
  readonly name: string;
  listBanks(): Promise<Bank[]>;
  resolveAccount(input: ResolveAccountInput): Promise<ResolvedAccount>;
}

export type FetchLike = typeof fetch;
