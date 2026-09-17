// Uses Paystack as the illustrative provider. FlutterwaveProvider,
// KorapayProvider, SquadProvider and MonnifyProvider implement the same
// BankProvider contract, so swapping providers only changes this block.
import { createServer } from "node:http";
import { NairaGateError, PaystackProvider, createNairaGate } from "nairagate";

const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is required.");

const nairaGate = createNairaGate({
  provider: new PaystackProvider({ secretKey }),
});

const server = createServer(async (request, response) => {
  if (request.method !== "GET" || !request.url) {
    response.writeHead(404).end();
    return;
  }

  const url = new URL(request.url, "http://localhost");
  if (url.pathname !== "/resolve") {
    response.writeHead(404).end();
    return;
  }

  const accountNumber = url.searchParams.get("accountNumber");
  const bankCode = url.searchParams.get("bankCode");
  if (!accountNumber || !bankCode) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(
      JSON.stringify({ error: "accountNumber and bankCode are required" }),
    );
    return;
  }

  try {
    const account = await nairaGate.accounts.resolve({
      accountNumber,
      bankCode,
    });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(account));
  } catch (error) {
    const status =
      error instanceof NairaGateError && error.code === "INVALID_INPUT"
        ? 400
        : 502;
    const code =
      error instanceof NairaGateError ? error.code : "INTERNAL_ERROR";
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: code }));
  }
});

server.listen(3000, () => {
  console.log("NairaGate example listening on http://localhost:3000");
});
