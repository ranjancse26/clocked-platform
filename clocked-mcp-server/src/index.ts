import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import express, { type Request, type Response, type NextFunction } from "express";
import { marked } from "marked";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { config, validateConfig } from "./config.js";
import { clockedFill } from "./clocked-fill-client.js";
import { clockedExtract } from "./clocked-extract-client.js";
import { clockedDecide } from "./clocked-decide-client.js";
import { fillInputSchema, runClockedFill } from "./tools/fill.js";
import { extractInputSchema, runClockedExtract } from "./tools/extract.js";
import { decideInputSchema, runClockedDecide } from "./tools/decide.js";

validateConfig();

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: config.jsonBodyLimit }));

// Dynamic docs folder relative to the compiled binary (ES module)
const docsDir = path.resolve(process.cwd(), "docs");
console.log("__dirname:", __dirname);
console.log("Serving docs from:", docsDir);

// ── Serve "docs" with Markdown to HTML conversion ────────────────────────────────────────────
app.use("/docs", async (req: Request, _res: Response, next: NextFunction) => {
  if (req.path.endsWith(".md")) {
    try {
      // req.path is like "/docs/api.md"; strip leading slash to get relative path
      const relativePath = req.path.substring(1);
      const filePath = path.join(docsDir, relativePath);
      const raw = await fs.readFile(filePath, "utf-8");
      const markdownHtml = marked.parse(raw);

      // Build a simple styled HTML page so the markdown looks polished
      const page = `
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${path.basename(relativePath, ".md")} – Clocked MCP Docs</title>
          <style>
            body {font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", sans-serif; margin: 2rem; line-height: 1.5; color: #2d3748; background: #f7f9fc;}
            h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; color: #2d3748; }
            pre { background: #e2e8f0; padding: 1rem; border-radius: 4px; overflow-x: auto; }
            code { font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace; background: #e2e8f0; padding: 0.2em 0.4em; border-radius: 3px; }
            table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
            th, td { border: 1px solid #cbd2d9; padding: 0.5rem; text-align: left; }
            th { background: #edf2f7; }
            .back-btn {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              margin-bottom: 1.5rem;
              padding: 0.5rem 1rem;
              background: #edf2f7;
              border: 1px solid #cbd2d9;
              border-radius: 6px;
              color: #2d3748;
              font-size: 0.9rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .back-btn:hover {
              background: #cbd5e1;
              border-color: #94a3b8;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <button type="button" class="back-btn" onclick="goBack()" aria-label="Back to docs">
            ← Back to docs
          </button>
          ${markdownHtml}
          <script>
            function goBack() {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = 'index.html';
              }
            }
          </script>
        </body>
        </html>`;
      _res.type("text/html").send(page);
    } catch (e) {
      console.error("Failed to read/convert markdown:", e);
      next();
    }
  } else {
    // Not a .md file – let the static handler decide (index.html, images, etc.)
    next();
  }
});

// Serve static docs (index.html for /docs, and any other assets)
app.use("/docs", express.static(docsDir, { index: "index.html" }));

function safeTokenEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireClientAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.mcpAccessToken) {
    next();
    return;
  }
  const match = (req.header("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !safeTokenEqual(match[1], config.mcpAccessToken)) {
    res.status(401).json({ error: "Unauthorized. Send Authorization: Bearer <MCP_ACCESS_TOKEN>." });
    return;
  }
  next();
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "clocked-mcp-server",
    version: "1.0.0"
  });

  server.registerTool(
    "clocked_fill",
    {
      title: "Clocked Fill",
      description:
        "Call the Clocked Fill API to extract, classify, score, or generate " +
        "structured fields from source text. Supply the source text, optional " +
        "instructions, and the Clocked fields object.",
      inputSchema: fillInputSchema
    },
    async (args) => {
      try {
        return await runClockedFill({
          text: args.text,
          instructions: args.instructions,
          fields: args.fields,
          request_id: args.request_id
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ error: message }) }]
        };
      }
    }
  );
  
  server.registerTool(
    "clocked_extract",
    {
      title: "Clocked Extract",
      description:
        "Call the Clocked Extract API to extract structured data from source text based on the provided fields definitions. Supply the source text, optional instructions, and the Clocked fields object.",
      inputSchema: extractInputSchema
    },
    async (args) => {
      try {
        return await runClockedExtract({
          text: args.text,
          instructions: args.instructions,
          fields: args.fields,
          request_id: args.request_id
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ error: message }) }]
        };
      }
    }
  );

  server.registerTool(
    "clocked_decide",
    {
      title: "Clocked Decide",
      description:
        "Call the Clocked Decide API to make decisions based on the provided state, instructions, and questions. Supply the incident state, optional instructions, and the questions object defining the decision criteria.",
      inputSchema: decideInputSchema
    },
    async (args) => {
      try {
        return await runClockedDecide({
          text: args.text,
          instructions: args.instructions,
          questions: args.questions,
          request_id: args.request_id
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ error: message }) }]
        };
      }
    }
  );

  return server;
}

// Health endpoint for process monitoring; does not call Clocked.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "clocked-mcp-server",
    version: "1.0.0"
  });
});

// MCP endpoint: the SDK transport must own its JSON-RPC response.
// Do not override res.json(), status codes, or transport-generated bodies.
app.all("/mcp", requireClientAuth, async (req: Request, res: Response) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal MCP server error." },
        id: null
      });
    }
  } finally {
    void transport.close();
    void server.close();
  }
});

// Simple REST endpoint for browser UI, curl, Postman, and non-MCP applications.
app.post("/api/fill", requireClientAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    res.status(400).json({ error: "Field 'text' is required and must be a non-empty string." });
    return;
  }
  if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) {
    res.status(400).json({ error: "Field 'fields' is required and must be a JSON object." });
    return;
  }
  if (body.instructions !== undefined && typeof body.instructions !== "string") {
    res.status(400).json({ error: "Field 'instructions' must be a string when provided." });
    return;
  }

  try {
    const result = await clockedFill({
      text: body.text,
      instructions: body.instructions as string | undefined,
      fields: body.fields as Record<string, unknown>,
      request_id: body.request_id as string | undefined
    });
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Clocked API request failed."
    });
  }
});

// Extract endpoint for Clocked extract API
app.post("/api/extract", requireClientAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    res.status(400).json({ error: "Field 'text' is required and must be a non-empty string." });
    return;
  }
  if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) {
    res.status(400).json({ error: "Field 'fields' is required and must be a JSON object." });
    return;
  }
  if (body.instructions !== undefined && typeof body.instructions !== "string") {
    res.status(400).json({ error: "Field 'instructions' must be a string when provided." });
    return;
  }

  try {
    const result = await clockedExtract({
      text: body.text,
      instructions: body.instructions as string | undefined,
      fields: body.fields as Record<string, unknown>,
      request_id: body.request_id as string | undefined
    });
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Clocked API request failed."
    });
  }
});

// Decide endpoint for Clocked decide API
app.post("/api/decide", requireClientAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    res.status(400).json({ error: "Field 'text' is required and must be a non-empty string." });
    return;
  }
  if (!body.questions || typeof body.questions !== "object" || Array.isArray(body.questions)) {
    res.status(400).json({ error: "Field 'questions' is required and must be a JSON object." });
    return;
  }
  if (body.instructions !== undefined && typeof body.instructions !== "string") {
    res.status(400).json({ error: "Field 'instructions' must be a string when provided." });
    return;
  }

  try {
    const result = await clockedDecide({
      state: body.text,
      instructions: body.instructions as string | undefined,
      questions: body.questions as Record<string, unknown>,
      request_id: body.request_id as string | undefined
    });
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Clocked API request failed."
    });
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    console.error("SyntaxError: Invalid JSON request body:", error);
    res.status(400).json({ error: "Invalid JSON request body." });
    return;
  }
  console.error("HTTP request failed:", error);
  res.status(500).json({ error: "Internal server error." });
});

const httpServer = app.listen(config.port, config.host, () => {
  console.log(`Clocked MCP server starting...`);
  console.log(`  Server address: http://${config.host}:${config.port}`);
  console.log(`  Docs at: http://${config.host}:${config.port}/docs`);
  console.log(`  MCP endpoint: http://${config.host}:${config.port}/mcp`);
  console.log(`  Health endpoint: http://${config.host}:${config.port}/health`);
  console.log(
    config.mcpAccessToken
      ? "  MCP endpoint authentication: enabled"
      : "  MCP endpoint authentication: disabled (suitable for local-only development)"
  );
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}; shutting down...`);
  httpServer.close(() => {
    console.log("HTTP server stopped.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
