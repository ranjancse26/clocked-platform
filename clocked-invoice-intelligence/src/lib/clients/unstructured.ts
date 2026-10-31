import type { ParsedDocument } from "@/lib/types-internal";

const PARSE_URL = process.env.UNSTRUCTURED_PARSE_URL || "https://transform.unstructured.io/api/v2/parse";

export async function parseWithUnstructured(file: File): Promise<ParsedDocument> {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;
  if (!apiKey) throw new Error("UNSTRUCTURED_API_KEY is required when DEMO_MODE=false.");

  const form = new FormData();
  form.append("input", file, file.name);

  const response = await fetch(PARSE_URL, {
    method: "POST",
    headers: { "unstructured-api-key": apiKey },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Unstructured parsing failed (${response.status}): ${safeMessage(body)}`);
  }
  if (body.status && !["completed", "complete", "succeeded"].includes(String(body.status).toLowerCase())) {
    throw new Error(`Unstructured returned status "${body.status}".`);
  }

  return {
    markdown: typeof body.markdown === "string" ? body.markdown : "",
    pageCount: typeof body.metadata?.page_count === "number" ? body.metadata.page_count : null,
    warnings: Array.isArray(body.warnings) ? body.warnings.map(String) : [],
    raw: body
  };
}

function safeMessage(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) return String((body as {message: unknown}).message).slice(0, 300);
  return "No provider error detail returned.";
}
