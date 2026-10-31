import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const CLOCKED_FILL_URL = `${config.clockedBaseUrl}/clocked/fill`;

export interface ClockedFillInput {
  text: string;
  instructions?: string;
  fields: Record<string, unknown>;
  request_id?: string;
}

export interface ClockedFillResult {
  request_id: string;
  status: number;
  success: boolean;
  result: unknown;
}

export class ClockedApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly requestId?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ClockedApiError";
  }
}

export async function clockedFill(
  input: ClockedFillInput
): Promise<ClockedFillResult> {
  if (!config.clockedApiKey) {
    throw new ClockedApiError("CLOCKED_API_KEY is not configured.");
  }

  let requestId = '';
  if (input.request_id && typeof input.request_id === "string" && input.request_id.trim()) {
    requestId = input.request_id.trim();
  } else {
    requestId = randomUUID();
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.clockedTimeoutMs);

  try {
    console.log(`Clocked Fill request starting, requestId: ${requestId}`);

    const response = await fetch(CLOCKED_FILL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.clockedApiKey}`,
        "Idempotency-Key": requestId,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        text: input.text,
        ...(input.instructions !== undefined
          ? { instructions: input.instructions }
          : {}),
        fields: input.fields
      }),
      signal: controller.signal
    });

    console.log(`Clocked Fill response received, status: ${response.status}, ok: ${response.ok}`);

    const responseText = await response.text();
    console.log(`Clocked Fill response text length: ${responseText.length}`);

    let responseBody: unknown = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as unknown;
      } catch {
        responseBody = responseText;
      }
    }

    return {
      request_id: requestId,
      status: response.status,
      success: response.ok,
      result: responseBody
    };
  } catch (error) {
    if (controller.signal.aborted) {
      console.error(`Clocked Fill request timed out after ${config.clockedTimeoutMs} ms. requestId: ${requestId}`);
      throw new ClockedApiError(
        `Clocked Fill request timed out after ${config.clockedTimeoutMs} ms. ` +
          `If retrying the same logical request, reuse request_id "${requestId}".`,
        undefined,
        requestId
      );
    }

    const message = error instanceof Error ? error.message : "Unknown network error";
    console.error(`Unable to reach the Clocked Fill API: ${message}, requestId: ${requestId}`);
    throw new ClockedApiError(
      `Unable to reach the Clocked Fill API: ${message}`,
      undefined,
      requestId
    );
  } finally {
    clearTimeout(timeout);
    console.log(`Clocked Fill request completed, requestId: ${requestId}`);
  }
}
