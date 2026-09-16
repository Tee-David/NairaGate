export type NairaGateErrorCode =
  | "INVALID_INPUT"
  | "AUTHENTICATION_FAILED"
  | "ACCOUNT_NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR";

export class NairaGateError extends Error {
  readonly code: NairaGateErrorCode;
  readonly provider: string | undefined;
  readonly status: number | undefined;
  override readonly cause: unknown;

  constructor(
    code: NairaGateErrorCode,
    message: string,
    options: { provider?: string; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "NairaGateError";
    this.code = code;
    this.provider = options.provider;
    this.status = options.status;
    this.cause = options.cause;
  }
}
