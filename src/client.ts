import type { BankProvider, ResolveAccountInput } from "./types.js";

export type NairaGateOptions = { provider: BankProvider };

export function createNairaGate({ provider }: NairaGateOptions) {
  return Object.freeze({
    provider: provider.name,
    banks: Object.freeze({
      list: () => provider.listBanks(),
    }),
    accounts: Object.freeze({
      resolve: (input: ResolveAccountInput) => provider.resolveAccount(input),
    }),
  });
}
