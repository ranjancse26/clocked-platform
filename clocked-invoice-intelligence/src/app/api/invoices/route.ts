import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

export const runtime = "nodejs";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const extAllowed = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".docx"]);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, filename: true, status: true, vendorName: true,
      invoiceNumber: true, totalMinor: true, currencyCode: true, createdAt: true
    }
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "A file field is required." }, { status: 400 });
    const maxMb = Number(process.env.MAX_UPLOAD_MB || 10);
    if (value.size <= 0 || value.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `File must be between 1 byte and ${maxMb} MB.` }, { status: 400 });
    }
    const extension = path.extname(value.name).toLowerCase();
    if (!extAllowed.has(extension) || !allowed.has(value.type)) {
      return NextResponse.json({ error: "Unsupported file type. Upload PDF, JPG, PNG, WEBP, or DOCX." }, { status: 415 });
    }
    const buffer = Buffer.from(await value.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
    await mkdir(uploadDir, { recursive: true });
    const storagePath = path.join(uploadDir, `${randomUUID()}${extension}`);
    await writeFile(storagePath, buffer, { flag: "wx", mode: 0o600 });
    const invoice = await prisma.invoice.create({
      data: {
        filename: path.basename(value.name).slice(0, 255),
        mimeType: value.type,
        fileHash: hash,
        storagePath,
        status: "uploaded"
      },
      select: { id: true, filename: true, status: true, createdAt: true }
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice upload failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Upload failed. Check server logs and database configuration." }, { status: 500 });
  }
}
