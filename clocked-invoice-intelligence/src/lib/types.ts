export type CheckStatus = "pass" | "fail" | "uncertain";
export type DuplicateStatus = "not_found" | "possible_duplicate" | "confirmed_duplicate" | "not_checked";

export interface InvoiceLineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  tax: number | null;
  line_total: number | null;
}

export interface ExtractedInvoice {
  vendor_name: string | null;
  vendor_address: string | null;
  account_number: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency_code: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  bill_to_name: string | null;
  bill_to_address: string | null;
  service_period: string | null;
  is_duplicate: boolean | null;
  duplicate_of: string | null;
  line_items: InvoiceLineItem[];
}

export interface ValidationResult {
  required_fields_present: boolean;
  line_items_match_subtotal: CheckStatus;
  subtotal_plus_tax_matches_total: CheckStatus;
  duplicate_status: DuplicateStatus;
  financial_validation: CheckStatus;
  review_reasons: string[];
  invoice_review_summary: string;
}

export interface DecisionResult {
  invoice_category: string;
  approval_recommendation: "approve" | "human_review" | "reject";
  requires_human_review: boolean;
  raw?: unknown;
}

export interface ProcessingResult {
  invoiceId: string;
  filename: string;
  status: string;
  parsedDocument: { markdown: string; pageCount: number | null; warnings: string[] };
  extractedFields: ExtractedInvoice;
  validation: ValidationResult;
  decision: DecisionResult;
  finalStatus: "ready_for_approval" | "human_review" | "rejected" | "processing_failed";
  demoMode: boolean;
}
