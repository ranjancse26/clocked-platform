import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processInvoice } from "@/lib/services/invoice-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await processInvoice(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
