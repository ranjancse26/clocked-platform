import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const CLOCKED_DECIDE_URL = `${config.clockedBaseUrl}/clocked/decide`;

export interface ClockedDecideInput {
  state: string;
  instructions?: string;
  questions: Record<string, unknown>;
  request_id?: string;
}

export interface ClockedDecideResult {
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

export async function clockedDecide(
  input: ClockedDecideInput
): Promise<ClockedDecideResult> {
  if (!config.clockedApiKey) {
    throw new ClockedApiError("CLOCKED_API_KEY is not configured.");
  }

  let requestId = "";
  if (input.request_id && typeof input.request_id === "string" && input.request_id.trim()) {
    requestId = input.request_id.trim();
  } else {
    requestId = randomUUID();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.clockedTimeoutMs);

  try {
    console.log(`Clocked Decide request starting, requestId: ${requestId}`);

    const response = await fetch(CLOCKED_DECIDE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.clockedApiKey}`,
        "Idempotency-Key": requestId,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        state: input.state,
        ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
        questions: input.questions
      }),
      signal: controller.signal
    });

    console.log(`Clocked Decide response received, status: ${response.status}, ok: ${response.ok}`);

    const responseText = await response.text();
    console.log(`Clocked Decide response text length: ${responseText.length}`);

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
      console.error(`Clocked Decide request timed out after ${config.clockedTimeoutMs} ms. requestId: ${requestId}`);
      throw new ClockedApiError(
        `Clocked Decide request timed out after ${config.clockedTimeoutMs} ms. ` +
          `If retrying the same logical request, reuse request_id "${requestId}".`,
        undefined,
        requestId
      );
    }

    const message = error instanceof Error ? error.message : "Unknown network error";
    console.error(`Unable to reach the Clocked Decide API: ${message}, requestId: ${requestId}`);
    throw new ClockedApiError(
      `Unable to reach the Clocked Decide API: ${message}`,
      undefined,
      requestId
    );
  } finally {
    clearTimeout(timeout);
    console.log(`Clocked Decide request completed, requestId: ${requestId}`);
  }
}