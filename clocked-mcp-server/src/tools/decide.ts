import { z } from "zod";
import { clockedDecide } from "../clocked-decide-client.js";

export interface ClockedDecideQuestion {
  type: "noul" | "choice" | "multiselect" | "score";
  instructions?: string;
  threshold?: number;
  criteria?: Record<string, string>;
  options?: string[];
}

export interface ClockedDecideInput {
  text: string;
  instructions?: string;
  questions: Record<string, ClockedDecideQuestion>;
  request_id?: string;
}

export const decideInputSchema = {
  text: z.string().min(1).describe("Source text to process."),
  instructions: z
    .string()
    .optional()
    .describe("Shared instructions for the decision process."),
  questions: z
    .record(
      z.object({
        type: z.enum(["noul", "choice", "multiselect", "score"]),
        instructions: z.string().optional(),
        threshold: z.number().optional(),
        criteria: z.record(z.string(), z.string()).optional(),
        options: z.array(z.string()).optional()
      })
    )
    .describe("Questions defining the decision criteria."),
  request_id: z
    .string()
    .optional()
    .describe("Optional idempotency key. Reuse it when retrying the same logical request.")
};

export async function runClockedDecide(input: {
  text: string;
  instructions?: string;
  questions: Record<string, unknown>;
  request_id?: string;
}) {
  const result = await clockedDecide({
    state: input.text,
    instructions: input.instructions,
    questions: input.questions,
    request_id: input.request_id
  });

  if (!result.success) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: "Clocked Decide API returned an HTTP error.",
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