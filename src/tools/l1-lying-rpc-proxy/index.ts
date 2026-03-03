import * as http from "http";
import * as https from "https";
import { URL } from "url";

// Configuration
const DEFAULT_PORT = 8545;
const DEFAULT_LIE_MULTIPLIER = 1_000_000n; // multiply every ERC-20 balance by this

function parseArgs(): { port: number; upstream: string; multiplier: bigint } {
  const args = process.argv.slice(2);
  let port = Number(process.env["PROXY_PORT"] ?? DEFAULT_PORT);
  let upstream = process.env["UPSTREAM_RPC"] ?? "";
  let multiplier = DEFAULT_LIE_MULTIPLIER;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = Number(args[++i]);
    } else if (args[i] === "--upstream" && args[i + 1]) {
      upstream = args[++i];
    } else if (args[i] === "--multiplier" && args[i + 1]) {
      multiplier = BigInt(args[++i]);
    }
  }

  if (!upstream) {
    console.error(
      "Error: upstream RPC URL is required (--upstream or UPSTREAM_RPC env var)"
    );
    process.exit(1);
  }

  return { port, upstream, multiplier };
}

// ERC-20 detection helpers

const BALANCE_OF_SELECTOR = "70a08231";

interface EthCallParams {
  to?: string;
  data?: string;
}

function isErc20BalanceOfCall(params: unknown[]): boolean {
  if (!Array.isArray(params) || params.length === 0) return false;
  const callObj = params[0] as EthCallParams;
  if (typeof callObj !== "object" || callObj === null) return false;
  const data: string = callObj.data ?? "";
  return data.toLowerCase().startsWith("0x" + BALANCE_OF_SELECTOR);
}

// Response manipulation
function lieAboutBalance(hexResult: string, multiplier: bigint): string {
  const clean = hexResult.startsWith("0x") ? hexResult.slice(2) : hexResult;
  if (clean.length === 0 || clean === "0".repeat(clean.length)) {
    // Balance is zero – lying wouldn't be very interesting, but do it anyway.
    const lied = 1_000_000n * multiplier; // invent 1 token unit × multiplier
    return "0x" + lied.toString(16).padStart(64, "0");
  }
  const original = BigInt("0x" + clean);
  const lied = original * multiplier;
  return "0x" + lied.toString(16).padStart(64, "0");
}


// JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: unknown[];
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: unknown;
}

// Upstream forwarding

function forwardToUpstream(
  upstreamUrl: string,
  body: Buffer
): Promise<{ statusCode: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(upstreamUrl);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length,
        "User-Agent": "l1-lying-rpc-proxy/1.0",
      },
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode ?? 200,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Main request handler

function createHandler(upstream: string, multiplier: bigint) {
  return async (
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> => {
    // Only accept POST /
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed – use POST" }));
      return;
    }

    // Read request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const rawBody = Buffer.concat(chunks);

    // Parse JSON
    let payload: JsonRpcRequest | JsonRpcRequest[];
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as
        | JsonRpcRequest
        | JsonRpcRequest[];
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    // Determine which requests are ERC-20 balanceOf calls
    const isBatch = Array.isArray(payload);
    const requests: JsonRpcRequest[] = isBatch
      ? (payload as JsonRpcRequest[])
      : [payload as JsonRpcRequest];

    const lieFlags: boolean[] = requests.map(
      (r) =>
        r.method === "eth_call" && isErc20BalanceOfCall(r.params ?? [])
    );

    // Forward to upstream
    let upstreamResult: { statusCode: number; body: Buffer };
    try {
      upstreamResult = await forwardToUpstream(upstream, rawBody);
    } catch (err) {
      console.error("[proxy] upstream error:", err);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Upstream unreachable" }));
      return;
    }

    // Parse upstream response
    let upstreamPayload: JsonRpcResponse | JsonRpcResponse[];
    try {
      upstreamPayload = JSON.parse(
        upstreamResult.body.toString("utf8")
      ) as JsonRpcResponse | JsonRpcResponse[];
    } catch {
      // If upstream returned non-JSON, pass through verbatim
      res.writeHead(upstreamResult.statusCode, {
        "Content-Type": "application/json",
      });
      res.end(upstreamResult.body);
      return;
    }

    // Mutate ERC-20 balance responses
    const responses: JsonRpcResponse[] = Array.isArray(upstreamPayload)
      ? upstreamPayload
      : [upstreamPayload];

    for (let i = 0; i < responses.length; i++) {
      if (!lieFlags[i]) continue;
      const resp = responses[i];
      if (
        resp &&
        typeof resp.result === "string" &&
        resp.result.startsWith("0x")
      ) {
        const originalBalance = resp.result;
        const liedBalance = lieAboutBalance(resp.result, multiplier);
        resp.result = liedBalance;
        console.log(
          `[proxy] LYING: ERC-20 balanceOf result changed ` +
            `${originalBalance} → ${liedBalance} (×${multiplier})`
        );
      }
    }

    const finalPayload: JsonRpcResponse | JsonRpcResponse[] = isBatch
      ? responses
      : responses[0];

    const finalBody = JSON.stringify(finalPayload);
    res.writeHead(upstreamResult.statusCode, {
      "Content-Type": "application/json",
    });
    res.end(finalBody);
  };
}

// Entry point

const { port, upstream, multiplier } = parseArgs();

const server = http.createServer((req, res) => {
  createHandler(upstream, multiplier)(req, res).catch((err) => {
    console.error("[proxy] unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal proxy error" }));
    }
  });
});

server.listen(port, () => {
  console.log(`[l1-lying-rpc-proxy] Listening on http://localhost:${port}`);
  console.log(`[l1-lying-rpc-proxy] Upstream: ${upstream}`);
  console.log(
    `[l1-lying-rpc-proxy] ERC-20 balance multiplier: ×${multiplier}`
  );
  console.log(`[l1-lying-rpc-proxy] Press Ctrl-C to stop.`);
});