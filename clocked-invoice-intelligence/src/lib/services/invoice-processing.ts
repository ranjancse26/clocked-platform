import { prisma } from "@/lib/db";
import { parseWithUnstructured } from "@/lib/clients/unstructured";
import { extractInvoice } from "@/lib/clients/clocked-extract";
import { detectInjection } from "@/lib/clients/clocked-injection";
import { decideInvoice } from "@/lib/clients/clocked-decide";
import { validateInvoice } from "@/lib/services/financial-validation";
import { checkDuplicate } from "@/lib/services/duplicate-detection";
import type { ExtractedInvoice, ProcessingResult } from "@/lib/types";
import type { ParsedDocument } from "@/lib/types-internal";
import { toMinorUnits, generateRequestId } from "@/lib/utils/utils";

export async function processInvoice(invoiceId: string): Promise<ProcessingResult> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found.");

  const run = await prisma.processingRun.create({
    data: { invoiceId, stage: "pipeline", status: "running" }
  });

  try {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "parsing", errorMessage: null } });
    const file = await import("node:fs/promises").then(fs => fs.readFile(invoice.storagePath));
    const uploaded = new File([new Uint8Array(file)], invoice.filename, { type: invoice.mimeType });
    const parsed: ParsedDocument = process.env.DEMO_MODE !== "false"
      ? await demoParse(invoice.filename)
      : await parseWithUnstructured(uploaded);
    if (!parsed.markdown.trim()) throw new Error("Parser returned no usable text.");

    // Clocked Injection/Guard: Detect instruction override attempts in the document
    try {
      await detectInjection(parsed.markdown, process.env.CLOCKED_API_KEY!, process.env.CLOCKED_INJECTION_URL!, generateRequestId());
    } catch (injectionError) {
      const injectionMessage = injectionError instanceof Error ? injectionError.message : "Unknown injection detection error";
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "processing_failed", errorMessage: injectionMessage }
      });
      await prisma.processingRun.update({
        where: { id: run.id },
        data: { status: "failed", message: injectionMessage, completedAt: new Date() }
      });
      throw new Error(`Invoice processing failed due to suspected injection/override attempt: ${injectionMessage}`);
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { parsedMarkdown: parsed.markdown, status: "extracting" }
    });

    const extracted = await extractInvoice(parsed.markdown) as ExtractedInvoice;
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        vendorName: extracted.vendor_name,
        invoiceNumber: extracted.invoice_number,
        invoiceDate: extracted.invoice_date,
        dueDate: extracted.due_date,
        currencyCode: extracted.currency_code,
        subtotalMinor: extracted.subtotal === null ? null : toMinorUnits(extracted.subtotal),
        taxMinor: extracted.tax === null ? null : toMinorUnits(extracted.tax),
        totalMinor: extracted.total === null ? null : toMinorUnits(extracted.total),
        extractedJson: JSON.parse(JSON.stringify(extracted)),
        status: "validating"
      }
    });

    const duplicate = await checkDuplicate(invoice.fileHash, extracted, invoiceId);
    const validation = validateInvoice(extracted, duplicate.status);
    await prisma.invoice.update({ where: { id: invoiceId }, data: { validationJson: JSON.parse(JSON.stringify(validation)), status: "deciding" } });

    const decision = await decideInvoice({
      markdown: parsed.markdown,
      extracted,
      validation,
      duplicateStatus: duplicate.status
    });

    // Deterministic safety gate: AI cannot override required checks or duplicate signals.
    const blocked = !validation.required_fields_present ||
      validation.financial_validation !== "pass" ||
      duplicate.status !== "not_found" ||
      extracted.is_duplicate === true ||
      decision.requires_human_review;
    const finalStatus = decision.approval_recommendation === "reject" && !blocked
      ? "rejected"
      : blocked
        ? "human_review"
        : "ready_for_approval";

    const result = {
      invoiceId,
      filename: invoice.filename,
      status: "completed",
      parsedDocument: { markdown: parsed.markdown, pageCount: parsed.pageCount, warnings: parsed.warnings },
      extractedFields: extracted,
      validation: {
        ...validation,
        duplicate_status: duplicate.status,
        review_reasons: [
          ...validation.review_reasons,
          ...(duplicate.matchedInvoiceId ? [`Matched existing invoice: ${duplicate.matchedInvoiceId}`] : [])
        ]
      },
      decision,
      finalStatus,
      demoMode: process.env.DEMO_MODE !== "false"
    } satisfies ProcessingResult;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: finalStatus,
        decisionJson: JSON.parse(JSON.stringify(decision)),
        resultJson: JSON.parse(JSON.stringify(result))
      }
    });
    await prisma.processingRun.update({
      where: { id: run.id },
      data: { status: "completed", completedAt: new Date(), details: { finalStatus } }
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "processing_failed", errorMessage: message }
    });
    await prisma.processingRun.update({
      where: { id: run.id },
      data: { status: "failed", message, completedAt: new Date() }
    });
    throw error;
  }
}

async function demoParse(filename: string): Promise<ParsedDocument> {
  return {
    markdown: `RUMPKE OF OHIO INC\n\n3800 STRUBLE RD\nCINCINNATI OH 45251\n\nCustomer #: 1234987650\nDate: 08/04/20\nService Period: AUGUST\n\nInvoice #: 0998811\nInvoice Total: 329.74\nDue Date: 08/19/20\n\nJOHN DOE\n1234 CUSTOMER AVE\nCLEVELAND OH 44114\n\n| Date | Description | Qty | Price | Total |\n|---|---|---:|---:|---:|\n| 08/01/20 | 2YD FL/MONTH-MSW | 1.00 | 116.32 | 116.32 |\n| 08/01/20 | FL CASTER SVC | 2.00 | 5.00 | 10.00 |\n| 08/01/20 | FUEL SURCHARGE FL | 1.00 | 29.89 | 29.89 |\n| 08/03/20 | 2YD FL/MONTH-MSW | 1.00 | 116.32 | 116.32 |\n| 08/03/20 | FL CASTER SVC | 1.00 | 5.00 | 5.00 |\n| 08/03/20 | FUEL SURCHARGE FL | 1.00 | 28.74 | 28.74 |\n\nSubtotal: 306.27\nTaxes: 23.47\nTOTAL: 329.74\n\nDemo parser fixture used for ${filename}.`,
    pageCount: 1,
    warnings: ["Demo mode uses a built-in fixture and does not parse the uploaded file."]
  };
}
