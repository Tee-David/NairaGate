import { NairaGateError, PaystackProvider, createNairaGate } from "nairagate";

const secretKey = process.env.PAYSTACK_SECRET_KEY;

if (!secretKey) {
  throw new Error("PAYSTACK_SECRET_KEY is required.");
}

const nairaGate = createNairaGate({
  provider: new PaystackProvider({ secretKey }),
});

export async function POST(request: Request) {
  // In production, authenticate/authorize the caller and enforce a distributed
  // per-user + per-IP rate limit before performing account resolution.
  const body = (await request.json()) as { accountNumber?: unknown; bankCode?: unknown };

  if (typeof body.accountNumber !== "string" || typeof body.bankCode !== "string") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const account = await nairaGate.accounts.resolve({
      accountNumber: body.accountNumber,
      bankCode: body.bankCode,
    });
    return Response.json(account);
  } catch (error) {
    if (error instanceof NairaGateError) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "RATE_LIMITED" ? 429 : 502;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
