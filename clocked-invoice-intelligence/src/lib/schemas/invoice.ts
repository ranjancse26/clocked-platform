import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().default(""),
  quantity: z.number().nullable().default(null),
  unit_price: z.number().nullable().default(null),
  tax: z.number().nullable().default(null),
  line_total: z.number().nullable().default(null)
});

export const invoiceSchema = z.object({
  vendor_name: z.string().nullable().default(null),
  vendor_address: z.string().nullable().default(null),
  account_number: z.string().nullable().default(null),
  invoice_number: z.string().nullable().default(null),
  invoice_date: z.string().nullable().default(null),
  due_date: z.string().nullable().default(null),
  currency_code: z.string().nullable().default(null),
  subtotal: z.number().nullable().default(null),
  tax: z.number().nullable().default(null),
  total: z.number().nullable().default(null),
  bill_to_name: z.string().nullable().default(null),
  bill_to_address: z.string().nullable().default(null),
  service_period: z.string().nullable().default(null),
  is_duplicate: z.boolean().nullable().default(null),
  duplicate_of: z.string().nullable().default(null),
  line_items: z.array(lineItemSchema).default([])
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;

export const invoiceExtractionSchema: Record<string, string> = {
  vendor_name: "Supplier/vendor legal or trading name",
  vendor_address: "Supplier address",
  account_number: "Customer or account number printed on invoice",
  invoice_number: "Invoice number",
  invoice_date: "Invoice date in YYYY-MM-DD format",
  due_date: "Payment due date in YYYY-MM-DD format",
  currency_code: "ISO 4217 currency code such as USD",
  subtotal: "Invoice subtotal before tax as a decimal number",
  tax: "Total tax amount as a decimal number",
  total: "Final invoice amount due as a decimal number",
  bill_to_name: "Bill-to customer name",
  bill_to_address: "Bill-to address",
  service_period: "Service period if present",
  is_duplicate: "Source data duplicate flag, if explicitly present; otherwise null",
  duplicate_of: "Identifier of duplicate document if explicitly present; otherwise null",
  line_items: "Array of invoice line items; each item has description, quantity, unit_price, tax, and line_total when available"
};
