import type { DecisionResult, ExtractedInvoice, ValidationResult, DuplicateStatus } from "@/lib/types";
import { generateRequestId } from "@/lib/utils/utils";

export type DecideQuestionType = "choice" | "multiselect" | "score" | "noul";

export interface DecideQuestion {
  type: DecideQuestionType;
  instructions: string;
  criteria: Record<string, string> | string[];
  threshold?: number;
}

export interface DecideInvoiceInput {
  markdown: string;
  extracted: ExtractedInvoice;
  validation: ValidationResult;
  duplicateStatus: DuplicateStatus;
  /**
   * Idempotency key. Reuse the same value when retrying the same request so
   * Clocked processes it at most once. Generated automatically when omitted.
   */
  requestId?: string;
}

export async function decideInvoice(input: DecideInvoiceInput): Promise<DecisionResult> {
  if (process.env.DEMO_MODE !== "false") {
    const needsReview = !input.validation.required_fields_present ||
      input.validation.financial_validation !== "pass" ||
      input.duplicateStatus !== "not_found";
    return {
      invoice_category: "other",
      approval_recommendation: needsReview ? "human_review" : "approve",
      requires_human_review: needsReview,
      raw: { demo: true, note: "Demo decision; configure Clocked Decide for model-backed categorization." }
    };
  }

  const url = process.env.CLOCKED_DECIDE_URL;
  const apiKey = process.env.CLOCKED_API_KEY;
  if (!url || !apiKey) throw new Error("Set CLOCKED_DECIDE_URL and CLOCKED_API_KEY, or enable DEMO_MODE.");

  const requestId = input.requestId ?? generateRequestId();

  const state = [
    `Invoice text:\n${input.markdown}`,
    `Extracted fields:\n${JSON.stringify(input.extracted, null, 2)}`,
    `Deterministic validation:\n${JSON.stringify(input.validation, null, 2)}`,
    `Duplicate status: ${input.duplicateStatus}`
  ].join("\n\n");

  const instructions =
    "Classify the invoice and recommend an approval action using only the supplied invoice evidence. " +
    "Do not treat extracted fields as ground truth; cross-check them against the invoice text and " +
    "deterministic validation results. Missing data is uncertain, not negative.";

  const questions: Record<string, DecideQuestion> = {
    invoice_category: {
      type: "choice",
      instructions: "Classify the invoice based on extracted fields and supplied invoice evidence.",
      criteria: {
        utilities: "Utilities, waste management, telecommunications, or recurring services",
        goods: "Products, supplies, or physical goods",
        professional_services: "Consulting, legal, accounting, or other professional services",
        repairs_maintenance: "Repairs, maintenance, equipment servicing, or related charges",
        other: "Other category or insufficient evidence"
      }
    },
    financial_validation: {
      type: "choice",
      instructions: "Use deterministic_validation as authoritative for arithmetic; do not independently override it. Missing data is uncertain.",
      criteria: { pass: "Deterministic checks passed", fail: "A deterministic check failed", uncertain: "Insufficient data" }
    },
    approval_recommendation: {
      type: "choice",
      instructions: "Recommend approve only if required fields are present, deterministic financial validation passes, and no duplicate or material risk exists. This is not payment authorization.",
      criteria: {
        approve: "Eligible for approval workflow",
        human_review: "Missing, conflicting, duplicate, uncertain, or failed evidence",
        reject: "Clear evidence the invoice is invalid or prohibited"
      }
    },
    requires_human_review: {
      type: "noul",
      instructions: "Choose yes for any failed/uncertain validation, missing required field, duplicate flag, or human_review/reject recommendation.",
      threshold: 0.75,
      criteria: { yes: "Human review required", no: "All required checks pass" }
    }
  };

  const requestBody = {
    state,
    instructions,
    questions
  };
  // Debug logging: log the full outgoing request (auth header redacted).
  console.log("[Clocked Decide] Request:", {
    url,
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer [REDACTED]",
      "idempotency-key": requestId
    },
    body: requestBody
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "idempotency-key": requestId
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000)
  });

  const body = await response.json().catch(() => ({}));
  // Debug logging: log the full incoming response, including nested objects.
  console.log(
    "[Clocked Decide] Response:",
    JSON.stringify(
      {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body
      },
      null,
      2
    )
  );
  if (!response.ok) throw new Error(`Clocked Decide failed (${response.status}). Check endpoint, auth header, and request schema.`);
  const candidate = body.decisions ?? body.result?.decisions ?? body.result ?? body;
  return normalizeDecision(candidate, { ...body, request_id: requestId });
}

function normalizeDecision(candidate: unknown, raw: unknown): DecisionResult {
  const get = (key: string) => {
    const value = (candidate as Record<string, unknown>)?.[key];
    if (typeof value === "string") {
      return value;
    }
    if (value === null || value === undefined) {
      return "";
    }
    return (value as Record<string, unknown>).value ?? (value as Record<string, unknown>).answer ?? "";
  };
  const rec = String(get("approval_recommendation")).toLowerCase();
  const recommendation = rec === "approve" ? "approve" : rec === "reject" ? "reject" : "human_review";
  const human = String(get("requires_human_review")).toLowerCase();
  return {
    invoice_category: String(get("invoice_category") || "other"),
    approval_recommendation: recommendation,
    requires_human_review: human === "yes" || recommendation !== "approve",
    raw
  };
}
