import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true, filename: true, mimeType: true, status: true, vendorName: true,
      invoiceNumber: true, invoiceDate: true, dueDate: true, currencyCode: true,
      subtotalMinor: true, taxMinor: true, totalMinor: true, extractedJson: true,
      parsedMarkdown: true, validationJson: true, decisionJson: true, resultJson: true,
      errorMessage: true, createdAt: true, updatedAt: true
    }
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json(invoice);
}
