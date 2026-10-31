# Clocked Invoice Intelligence — MVP

A minimal Next.js + React invoice-processing application using:

1. **Unstructured.io Transform** to parse uploaded documents into Markdown/text.
2. **Clocked Injection guard** to screen the parsed content for instruction-override / prompt-injection attempts before extraction proceeds.
3. **Clocked Extract** to produce structured invoice fields.
4. **Deterministic TypeScript validation** for required fields, financial reconciliation, and duplicate checks.
5. **Clocked Decide** to categorize invoices and recommend an outcome.
6. **PostgreSQL + Prisma** for invoice records, results, and processing history.

The app deliberately stops at a recommendation. It does **not** authorize or initiate payment.

## What is included

- Invoice upload screen and minimalistic results UI.
- Processing history.
- API settings guidance (credentials are never shown).
- Server-side provider clients (Unstructured, Clocked Extract, Clocked Decide, and Clocked Injection guard).
- Zod extraction schema based on the supplied n8n workflow.
- Financial validation tests.
- PostgreSQL Prisma schema.
- JSON result export.
- Demo mode so the UI can be explored without API credentials.

## Requirements

- Node.js 20.9+ (Node 22 LTS recommended)
- npm
- PostgreSQL 15+ (or a compatible PostgreSQL service)

## Quick start

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` to a local PostgreSQL database, then:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

### Demo mode

`.env.example` sets `DEMO_MODE="true"`. In demo mode, the uploaded file is saved locally, but the parsing/extraction pipeline uses a built-in Rumpke sample fixture and does **not** send the file to external services. This is intended for UI walkthroughs only; it is not a real document parser and the displayed extracted data does not come from the uploaded file.

To test the financial engine:

```bash
npm test
```

## Configure live provider APIs

Set the following in `.env`:

```dotenv
DEMO_MODE="false"
UNSTRUCTURED_API_KEY="replace-with-rotated-key"
UNSTRUCTURED_PARSE_URL="https://transform.unstructured.io/api/v2/parse"
CLOCKED_API_KEY="your-clocked-api-key"
CLOCKED_EXTRACT_URL="your-exact-clocked-extract-endpoint"
CLOCKED_DECIDE_URL="your-exact-clocked-decide-endpoint"
CLOCKED_INJECTION_URL="your-exact-clocked-injection-endpoint"
DATABASE_URL="postgresql://..."
```

**Important integration note:** the supplied n8n export establishes the logical request bodies and invoice field/decision schema, but this project has not been given a verified Clocked base URL, authentication header contract, or a captured live API response. Therefore, the Clocked clients are adapters that may need a small adjustment for your Clocked account/API version. Confirm the exact endpoint, auth mechanism, request envelope, and response envelope for each provider in the Clocked documentation:
- https://clocked.rezolve.ai/docs/extract
- https://clocked.rezolve.ai/docs/decide
- https://clocked.rezolve.ai/clocked/injection

The current adapter uses `Authorization: Bearer <key>` and a common JSON envelope as a starting point. Do not assume this matches every Clocked deployment without checking the docs. The adapter intentionally raises an error if the response does not match the expected extraction schema.

The Unstructured client uses the supplied Transform API pattern:
- `POST https://transform.unstructured.io/api/v2/parse`
- multipart form field `input`
- `unstructured-api-key` header

Rotate any API key previously pasted into chat or committed to source control. Never use `NEXT_PUBLIC_` for secrets.

## Processing pipeline

```text
Upload
  -> Unstructured.io parse
  -> Clocked Injection guard (instruction-override screen)
  -> Clocked Extract
  -> Deterministic validation
  -> Duplicate lookup
  -> Clocked Decide
  -> Deterministic safety gate
  -> Persist results
```

## Invoice schema

Field names follow the supplied workflow:
- `vendor_name`, `vendor_address`, `account_number`
- `invoice_number`, `invoice_date`, `due_date`, `currency_code`
- `subtotal`, `tax`, `total`
- `bill_to_name`, `bill_to_address`, `service_period`
- `is_duplicate`, `duplicate_of`, `line_items`

Line items have `description`, `quantity`, `unit_price`, `tax`, and `line_total`.

## Sample Invoice Processing

The app ships with a built-in Rumpke sample invoice (`public/sample/veryfi-rumpke-invoice.jpg`) so the pipeline can be exercised without uploading your own document.

### Using the sample

- In the UI, choose **Process sample invoice** on the upload screen. The app fetches `public/sample/veryfi-rumpke-invoice.jpg`, submits it through the normal `POST /api/invoices` upload route, and runs the full processing pipeline.
- In demo mode (`DEMO_MODE="true"`), the uploaded file is saved locally but parsing and extraction use a built-in Rumpke fixture instead of calling Unstructured or Clocked. The uploaded file contents are **not** parsed; the displayed extracted data comes from the fixture.
- To process the sample with live providers, set `DEMO_MODE="false"` and configure the Unstructured and Clocked credentials (see "Configure live provider APIs").

### Sample invoice data (Rumpke fixture)

| Field | Value |
|---|---|
| Vendor | Rumpke of Ohio Inc |
| Account / Customer # | 1234987650 |
| Invoice # | 0998811 |
| Invoice date | 2020-08-04 |
| Due date | 2020-08-19 |
| Service period | AUGUST |
| Bill to | John Doe, 1234 Customer Ave, Cleveland OH 44114 |
| Currency | USD |

Line items:

| Description | Qty | Unit price | Line total |
|---|---|---|---|
| 2YD FL/MONTH-MSW | 1.00 | 116.32 | 116.32 |
| FL CASTER SVC | 2.00 | 5.00 | 10.00 |
| FUEL SURCHARGE FL | 1.00 | 29.89 | 29.89 |
| 2YD FL/MONTH-MSW | 1.00 | 116.32 | 116.32 |
| FL CASTER SVC | 1.00 | 5.00 | 5.00 |
| FUEL SURCHARGE FL | 1.00 | 28.74 | 28.74 |

### Financial arithmetic

The fixture is deliberately consistent so the deterministic validation engine passes:

- Subtotal: $306.27
- Tax: $23.47
- Total: $329.74
- Check: $306.27 + $23.47 = $329.74 (within the 0.01 tolerance) → `pass`
- Line-item totals sum to $306.27 → `pass`

Use this sample to verify the end-to-end flow (upload → parse → injection guard → extract → validate → decide → result) before processing real invoices. The demo fixture is not a real document parser — do not use it for production invoice data.

## Deterministic validation rules

- Subtotal + tax must equal total within 0.01 currency units.
- Line items are summed when all line totals are present.
- Missing/ambiguous amounts result in `uncertain`, not `pass`.
- Exact file hash matches are confirmed duplicates; vendor + invoice-number matches are possible duplicates.
- Missing required fields, financial fail/uncertain, duplicate flags, or a non-approve Clocked decision result in human review.
- Clocked Decide cannot override a deterministic financial failure.
- A suspected injection/override attempt (Clocked Injection verdict `injection`) halts processing before extraction and results in review/processing failure.
- Approval recommendation is not payment authorization.

## API Reference

All API routes are Next.js route handlers under `/api/invoices`. Every route requires a Clerk session: send `Authorization: Bearer <clerk-session-token>` on each request; unauthenticated requests receive `401 Unauthorized`. In demo mode (`DEMO_MODE="true"`) the processing pipeline uses the built-in Rumpke fixture and does not call external providers.

### Endpoints

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/invoices` | List recent invoices |
| `POST` | `/api/invoices` | Upload invoice (multipart field `file`) |
| `GET` | `/api/invoices/:id` | Retrieve invoice/result record |
| `POST` | `/api/invoices/:id/process` | Run processing pipeline |
| `GET` | `/api/invoices/:id/document` | Stream the private original document |

### GET /api/invoices — List invoices

Returns up to 100 recent invoices, newest first, with a subset of stored fields.

**Response (200)**
```json
[
  {
    "id": "invoice_abc123",
    "filename": "veryfi-rumpke-invoice.jpg",
    "status": "ready_for_approval",
    "vendorName": "Rumpke of Ohio Inc",
    "invoiceNumber": "0998811",
    "totalMinor": 32974,
    "currencyCode": "USD",
    "createdAt": "2026-10-31T00:00:00Z"
  }
]
```

**Errors**
- `401` — unauthenticated

### POST /api/invoices — Upload an invoice

Upload a document for processing as multipart form data with the file in field `file`.

**Request**
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer <clerk-session-token>" \
  -F "file=@/path/to/invoice.pdf"
```

**Constraints**
- Size: 1 byte to `MAX_UPLOAD_MB` (default 10 MB).
- Types: PDF, JPG, PNG, WEBP, or DOCX (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.docx`).

**Response (201)**
```json
{
  "id": "invoice_abc123",
  "filename": "veryfi-rumpke-invoice.jpg",
  "status": "uploaded",
  "createdAt": "2026-10-31T00:00:00Z"
}
```

**Errors**
- `400` — missing `file` field, empty file, or file outside the allowed size.
- `401` — unauthenticated.
- `415` — unsupported file type.
- `500` — upload or database failure.

### GET /api/invoices/:id — Retrieve an invoice

Returns the stored invoice record, including extracted fields, parsed markdown, validation, decision, and result JSON.

**Response (200)**
```json
{
  "id": "invoice_abc123",
  "filename": "veryfi-rumpke-invoice.jpg",
  "mimeType": "application/pdf",
  "status": "ready_for_approval",
  "vendorName": "Rumpke of Ohio Inc",
  "invoiceNumber": "0998811",
  "invoiceDate": "2020-08-04",
  "dueDate": "2020-08-19",
  "currencyCode": "USD",
  "subtotalMinor": 30627,
  "taxMinor": 2347,
  "totalMinor": 32974,
  "extractedJson": { ... },
  "parsedMarkdown": "...",
  "validationJson": { ... },
  "decisionJson": { ... },
  "resultJson": { ... },
  "errorMessage": null,
  "createdAt": "2026-10-31T00:00:00Z",
  "updatedAt": "2026-10-31T00:05:00Z"
}
```

**Errors**
- `401` — unauthenticated.
- `404` — invoice not found.

### POST /api/invoices/:id/process — Run the processing pipeline

Runs the full pipeline for an uploaded invoice:

```
Upload → Unstructured parse → Clocked Injection guard → Clocked Extract →
Deterministic validation → Duplicate lookup → Clocked Decide →
Deterministic safety gate → Persist results
```

The server reads the stored file from disk, so this route is meaningful on deployments with persistent local storage (or equivalent object storage).

**Response (200)** — the processing result: invoice ID, filename, status, parsed document, extracted fields, validation, decision, `finalStatus`, and `demoMode`.

**Errors**
- `401` — unauthenticated.
- `404` — invoice not found.
- `500` — pipeline failure (for example a suspected injection attempt, provider error, or unrecoverable validation failure).

Amounts are stored and returned in minor units (cents) via `subtotalMinor`, `taxMinor`, and `totalMinor`.

### GET /api/invoices/:id/document — Stream the original document

Streams the privately stored original file inline.

**Response headers**
- `Content-Type`: document MIME type
- `Content-Disposition`: `inline; filename="<original-name>"`
- `Cache-Control`: `private, no-store`
- `X-Content-Type-Options`: `nosniff`

**Errors**
- `401` — unauthenticated.
- `404` — invoice not found or stored document unavailable.

### External provider contracts

The server-side adapters call the following external providers. These are not part of this app's API surface, but their shapes follow the supplied n8n workflow:

- **Unstructured Transform** — `POST https://transform.unstructured.io/api/v2/parse`, multipart field `input`, header `unstructured-api-key`.
- **Clocked Extract** — extracts structured invoice fields from parsed text. Scalar values may arrive wrapped in `{ value, start, end, confidence }` objects; the adapter unwraps them automatically.
- **Clocked Injection guard** — screens parsed text for instruction-override / prompt-injection attempts. A verdict of `injection` halts processing before extraction.
- **Clocked Decide** — categorizes the invoice and returns an approval recommendation.

See "Configure live provider APIs" for the environment variables and the Clocked documentation links. The adapters assume `Authorization: Bearer <key>` and a common JSON envelope as a starting point; confirm the exact endpoint, auth header, request envelope, and response envelope for your Clocked deployment against the provider documentation.

### Result schema

Extraction field names are listed in "Invoice schema". Validation fields (`required_fields_present`, `subtotal_plus_tax_matches_total`, `line_items_match_subtotal`, `duplicate_status`, `financial_validation`, `review_reasons`) are defined in "Deterministic validation rules".

## Important MVP limitations / before production

This is an implementation starter, not a production-hardened platform.

- Use private object storage (S3, etc.) instead of local disk on serverless deployments.
- Add upload malware scanning and stronger file-signature validation.
- Add durable job queue/background processing for long-running provider calls; serverless request duration varies by host.
- Confirm Clocked request/response formats (Extract, Decide, and Injection) and normalize actual response envelopes.
- Improve live extraction normalization for numeric strings, locale-specific decimal formats, and date formats.
- Add retention/deletion controls and redact PII from logs.
- Add rate limiting, provider retry/backoff, idempotency keys, and operational monitoring.
- Do not treat a missing duplicate check as a clean duplicate result.
- Review licensing and provider terms before commercial deployment.

## Test suite

The included Vitest tests cover:
- Supplied Rumpke invoice arithmetic ($306.27 + $23.47 = $329.74).
- Incorrect totals.
- Missing tax.
- Duplicate review flag.

Run `npm test`.

## Folder layout

```text
src/app/                  Next.js pages and API routes
src/components/           Reserved for extracted UI components
src/lib/clients/          Unstructured and Clocked API adapters (incl. Injection guard)
src/lib/services/         Pipeline, duplicate detection, financial rules
src/lib/schemas/          Extraction schema
prisma/schema.prisma      Persistence model
tests/                    Financial validation regression tests
```
