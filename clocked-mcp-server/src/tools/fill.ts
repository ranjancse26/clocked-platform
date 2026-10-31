import { z } from "zod";
import { clockedFill } from "../clocked-fill-client.js";

export const fillInputSchema = {
  text: z.string().min(1).describe("Source text to process."),
  instructions: z
    .string()
    .optional()
    .describe("Shared instructions for extraction, classification, scoring, or generation."),
  fields: z
    .record(z.string(), z.unknown())
    .describe("Clocked Fill field definitions. Each key is an output field name."),
  request_id: z
    .string()
    .optional()
    .describe("Optional idempotency key. Reuse it when retrying the same logical request.")
};

export async function runClockedFill(input: {
  text: string;
  instructions?: string;
  fields: Record<string, unknown>;
  request_id?: string;
}) {
  const result = await clockedFill(input);

  if (!result.success) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: "Clocked Fill API returned an HTTP error.",
              request_id: result.request_id,
              status: result.status,
              details: result.result
            },
            null,
            2
          )
        }
      ]
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}
