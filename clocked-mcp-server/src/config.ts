import "dotenv/config";

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  host: process.env.HOST || "127.0.0.1",
  port: positiveInteger(process.env.PORT, 3001),
  clockedApiKey: process.env.CLOCKED_API_KEY || "",
  clockedBaseUrl: process.env.CLOCKED_BASE_URL || "https://clocked.rezolve.ai",
  clockedTimeoutMs: positiveInteger(process.env.CLOCKED_TIMEOUT_MS, 60_000),
  mcpAccessToken: process.env.MCP_ACCESS_TOKEN || "",
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "2mb"
};

export function validateConfig(): void {
  if (!config.clockedApiKey) {
    throw new Error(
      "CLOCKED_API_KEY is required. Copy .env.example to .env and configure it."
    );
  }
}
