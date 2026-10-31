import { describe, expect, it } from "vitest";
import { validateInvoice } from "../src/lib/services/financial-validation";
import type { ExtractedInvoice } from "../src/lib/types";

const base: ExtractedInvoice = {
  vendor_name: "Rumpke of Ohio Inc",
  vendor_address: null,
  account_number: "1234987650",
  invoice_number: "0998811",
  invoice_date: "2020-08-04",
  due_date: "2020-08-19",
  currency_code: "USD",
  subtotal: 306.27,
  tax: 23.47,
  total: 329.74,
  bill_to_name: "John Doe",
  bill_to_address: null,
  service_period: "AUGUST",
  is_duplicate: null,
  duplicate_of: null,
  line_items: [
    { description: "A", quantity: 1, unit_price: 116.32, tax: null, line_total: 116.32 },
    { description: "B", quantity: 2, unit_price: 5, tax: null, line_total: 10 },
    { description: "C", quantity: 1, unit_price: 29.89, tax: null, line_total: 29.89 },
    { description: "D", quantity: 1, unit_price: 116.32, tax: null, line_total: 116.32 },
    { description: "E", quantity: 1, unit_price: 5, tax: null, line_total: 5 },
    { description: "F", quantity: 1, unit_price: 28.74, tax: null, line_total: 28.74 }
  ]
};

describe("validateInvoice", () => {
  it("passes the supplied Rumpke financial arithmetic", () => {
    const result = validateInvoice(base, "not_found");
    expect(result.subtotal_plus_tax_matches_total).toBe("pass");
    expect(result.line_items_match_subtotal).toBe("pass");
    expect(result.financial_validation).toBe("pass");
  });

  it("fails when invoice total is wrong", () => {
    const result = validateInvoice({ ...base, total: 400 }, "not_found");
    expect(result.subtotal_plus_tax_matches_total).toBe("fail");
    expect(result.financial_validation).toBe("fail");
  });

  it("returns uncertain when tax is missing", () => {
    const result = validateInvoice({ ...base, tax: null }, "not_found");
    expect(result.subtotal_plus_tax_matches_total).toBe("uncertain");
    expect(result.financial_validation).toBe("uncertain");
  });

  it("flags a duplicate for review", () => {
    const result = validateInvoice(base, "possible_duplicate");
    expect(result.duplicate_status).toBe("possible_duplicate");
    expect(result.review_reasons.some((r) => r.toLowerCase().includes("duplicate"))).toBe(true);
  });
});
