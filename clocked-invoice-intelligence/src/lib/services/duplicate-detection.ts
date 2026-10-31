import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { DuplicateStatus, ExtractedInvoice } from "@/lib/types";

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function checkDuplicate(
  fileHash: string,
  extracted: ExtractedInvoice,
  excludeInvoiceId?: string
): Promise<{ status: DuplicateStatus; matchedInvoiceId: string | null }> {
  const exactFile = await prisma.invoice.findFirst({
    where: { fileHash, ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}) },
    select: { id: true }
  });
  if (exactFile) return { status: "confirmed_duplicate", matchedInvoiceId: exactFile.id };

  if (extracted.vendor_name && extracted.invoice_number) {
    const candidate = await prisma.invoice.findFirst({
      where: {
        vendorName: { equals: extracted.vendor_name, mode: "insensitive" },
        invoiceNumber: { equals: extracted.invoice_number, mode: "insensitive" },
        ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {})
      },
      select: { id: true }
    });
    if (candidate) return { status: "possible_duplicate", matchedInvoiceId: candidate.id };
  }
  return { status: "not_found", matchedInvoiceId: null };
}
