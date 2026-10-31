import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { filename: true, mimeType: true, storagePath: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  try {
    const bytes = await readFile(invoice.storagePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": invoice.mimeType,
        "Content-Disposition": `inline; filename="${invoice.filename.replace(/["\\]/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "Stored document is unavailable." }, { status: 404 });
  }
}
