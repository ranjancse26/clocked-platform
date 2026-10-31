-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "dueDate" TEXT,
    "currencyCode" TEXT,
    "subtotalMinor" INTEGER,
    "taxMinor" INTEGER,
    "totalMinor" INTEGER,
    "extractedJson" JSONB,
    "parsedMarkdown" TEXT,
    "validationJson" JSONB,
    "decisionJson" JSONB,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingRun" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessingRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_fileHash_idx" ON "Invoice"("fileHash");

-- CreateIndex
CREATE INDEX "Invoice_vendorName_invoiceNumber_idx" ON "Invoice"("vendorName", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessingRun_invoiceId_startedAt_idx" ON "ProcessingRun"("invoiceId", "startedAt");

-- AddForeignKey
ALTER TABLE "ProcessingRun" ADD CONSTRAINT "ProcessingRun_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
