import { z } from "zod";
import { clockedExtract } from "../clocked-extract-client.js";

export const extractInputSchema = {
  text: z.string().min(1).describe("Source text to process."),
  instructions: z
    .string()
    .optional()
    .describe("Shared instructions for extraction, classification, scoring, or generation."),
  fields: z
    .record(z.string(), z.unknown())
    .describe("Clocked Extract field definitions. Each key is an output field name."),
  request_id: z
    .string()
    .optional()
    .describe("Optional idempotency key. Reuse it when retrying the same logical request."),
};

export async function runClockedExtract(input: {
  text: string;
  instructions?: string;
  fields: Record<string, unknown>;
  request_id?: string;
}) {
  const result = await clockedExtract(input);

  if (!result.success) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: "Clocked Extract API returned an HTTP error.",
              request_id: result.request_id,
              status: result.status,
              details: result.result
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}