#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { createNairaGate } from "./client.js";
import { NairaGateError } from "./errors.js";
import type { BankProvider } from "./types.js";
import { PaystackProvider } from "./providers/paystack.js";
import { FlutterwaveProvider } from "./providers/flutterwave.js";

const SUPPORTED_PROVIDERS = ["paystack", "flutterwave"] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

function resolveProvider(): BankProvider {
  const requested = (process.env.NAIRAGATE_PROVIDER?.trim().toLowerCase() ||
    "paystack") as SupportedProvider;

  if (requested === "flutterwave") {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new Error(
        "FLUTTERWAVE_SECRET_KEY is required to start nairagate-mcp with NAIRAGATE_PROVIDER=flutterwave.",
      );
    }
    return new FlutterwaveProvider({ secretKey });
  }

  if (requested === "paystack") {
    const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is required to start nairagate-mcp.",
      );
    }
    return new PaystackProvider({ secretKey });
  }

  throw new Error(
    `Unsupported NAIRAGATE_PROVIDER "${requested}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}.`,
  );
}

function createServer(): McpServer {
  const nairaGate = createNairaGate({ provider: resolveProvider() });
  const server = new McpServer({
    name: "nairagate",
    version: "0.1.0",
  });

  server.registerTool(
    "list_banks",
    {
      title: "List Nigerian banks",
      description:
        "List Nigerian banks available through the configured NairaGate provider.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        banks: z.array(z.object({ name: z.string(), code: z.string() })),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const banks = await nairaGate.banks.list();
        const output = { banks };
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "resolve_account",
    {
      title: "Resolve Nigerian bank account",
      description:
        "Resolve an account holder name from a Nigerian account number and bank code.",
      inputSchema: z.object({
        accountNumber: z.string().regex(/^\d{10}$/),
        bankCode: z.string().regex(/^\d{2,6}$/),
      }),
      outputSchema: z.object({
        accountNumber: z.string(),
        accountName: z.string(),
        bankCode: z.string(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ accountNumber, bankCode }) => {
      try {
        const output = await nairaGate.accounts.resolve({
          accountNumber,
          bankCode,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

function toolError(error: unknown) {
  const code = error instanceof NairaGateError ? error.code : "INTERNAL_ERROR";
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify({ error: code }) }],
  };
}

serveStdio(() => createServer());
