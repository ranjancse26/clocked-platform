import type { CheckStatus, DuplicateStatus, ExtractedInvoice, ValidationResult } from "@/lib/types";
import { toMinorUnits } from "@/lib/utils/utils";

const TOLERANCE_MINOR = 1;

function statusForAvailableValues(values: Array<number | null>): boolean {
  return values.every((v) => typeof v === "number" && Number.isFinite(v));
}

export function validateInvoice(
  invoice: ExtractedInvoice,
  duplicateStatus: DuplicateStatus = "not_checked"
): ValidationResult {
  const requiredFieldsPresent = Boolean(
    invoice.vendor_name?.trim() &&
    invoice.invoice_number?.trim() &&
    invoice.invoice_date &&
    invoice.currency_code?.trim() &&
    invoice.total !== null
  );

  let subtotalTaxStatus: CheckStatus = "uncertain";
  if (statusForAvailableValues([invoice.subtotal, invoice.tax, invoice.total])) {
    const expected = toMinorUnits(invoice.subtotal as number) + toMinorUnits(invoice.tax as number);
    const actual = toMinorUnits(invoice.total as number);
    subtotalTaxStatus = Math.abs(expected - actual) <= TOLERANCE_MINOR ? "pass" : "fail";
  }

  let lineItemsStatus: CheckStatus = "uncertain";
  const lineItemsHaveTotals = invoice.line_items.length > 0 &&
    invoice.line_items.every((item) => typeof item.line_total === "number" && Number.isFinite(item.line_total));
  if (lineItemsHaveTotals && typeof invoice.subtotal === "number") {
    const sum = invoice.line_items.reduce((acc, item) => acc + toMinorUnits(item.line_total as number), 0);
    lineItemsStatus = Math.abs(sum - toMinorUnits(invoice.subtotal)) <= TOLERANCE_MINOR ? "pass" : "fail";
  }

  let financial: CheckStatus = "uncertain";
  if (subtotalTaxStatus === "fail" || lineItemsStatus === "fail") financial = "fail";
  else if (subtotalTaxStatus === "pass" && (lineItemsStatus === "pass" || lineItemsStatus === "uncertain")) financial = "pass";

  const reasons: string[] = [];
  if (!requiredFieldsPresent) reasons.push("One or more required invoice fields are missing.");
  if (subtotalTaxStatus === "fail") reasons.push("Subtotal plus tax does not reconcile with the invoice total.");
  if (subtotalTaxStatus === "uncertain") reasons.push("Subtotal, tax, or total is missing or ambiguous.");
  if (lineItemsStatus === "fail") reasons.push("Line-item totals do not reconcile with the stated subtotal.");
  if (lineItemsStatus === "uncertain") reasons.push("Line-item reconciliation could not be completed from available data.");
  if (duplicateStatus === "possible_duplicate" || duplicateStatus === "confirmed_duplicate") {
    reasons.push("A possible or confirmed duplicate invoice requires investigation.");
  }
  if (duplicateStatus === "not_checked") reasons.push("Duplicate detection has not been completed.");

  const summary = financial === "pass"
    ? "Available financial checks reconcile. Review any remaining missing-field or duplicate flags before approval."
    : financial === "fail"
      ? "One or more financial checks failed. Human review is required."
      : "Financial validation is uncertain because required values or line-item evidence are incomplete.";

  return {
    required_fields_present: requiredFieldsPresent,
    line_items_match_subtotal: lineItemsStatus,
    subtotal_plus_tax_matches_total: subtotalTaxStatus,
    duplicate_status: duplicateStatus,
    financial_validation: financial,
    review_reasons: reasons,
    invoice_review_summary: summary
  };
}
