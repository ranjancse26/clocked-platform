# Clocked MCP Server

## Overview

The Clocked MCP Server is a standalone TypeScript MCP (Model Context Protocol) server that exposes the Clocked Fill, Extract, and Decide APIs from Rezolve.ai over Streamable HTTP. It runs directly on Node.js; Docker is not required.

Instead of calling the Clocked REST endpoints directly, MCP-compatible clients - such as n8n, Claude Desktop, Cursor, and other Model Context Protocol hosts - discover and invoke three standardized MCP tools over a single Streamable HTTP endpoint. The server translates each MCP tool call into an authenticated HTTP request to the corresponding Clocked API:

| MCP Tool | Clocked API Endpoint | Purpose |
|----------|----------------------|---------|
| `clocked_fill` | `POST https://clocked.rezolve.ai/clocked/fill` | Extracts, classifies, scores, or generates structured fields from free-form text based on a `fields` definition object. |
| `clocked_extract` | `POST https://clocked.rezolve.ai/clocked/extract` | Pulls specific entities or values from free-form text based on `fields` definitions (form-like data such as names, dates, and items). |
| `clocked_decide` | `POST https://clocked.rezolve.ai/clocked/decide` | Answers decision questions based on a state description and a `questions` definition object (approvals, priority, affected systems). |

### How it works

1. An MCP client connects to `http://<host>:<port>/mcp` using the Streamable HTTP transport.
2. The client lists available tools and discovers `clocked_fill`, `clocked_extract`, and `clocked_decide`.
3. The client invokes a tool with arguments such as `text`, `fields`/`questions`, optional `instructions`, and an optional `request_id` idempotency key.
4. The server forwards the request to the matching Clocked API, attaching `CLOCKED_API_KEY` as a Bearer token and the `request_id` (or a generated UUID) as the `Idempotency-Key` header.
5. The server returns the Clocked API response back to the MCP client as structured text.

### Key design principles

- **Stateless** - Each MCP request is independent. The server does not maintain conversational session state; all context must be carried in the request payload.
- **Auth separation** - `MCP_ACCESS_TOKEN` protects the MCP endpoint itself (clients send it as `Authorization: Bearer`), while `CLOCKED_API_KEY` is used only for outbound requests to Clocked. The two tokens are independent and managed separately.
- **No Docker required** - Plain TypeScript on Node.js. Install with `npm install`, build with `npm run build`, run with `npm start`, or use `npm run dev` for development.
- **Idempotency support** - Supplying the same `request_id` when retrying a logical request enables Clocked's idempotency behavior; omitting it causes the server to generate a UUID.

### Who is this for

This server is primarily intended for n8n users who want to bring AI-powered fill, extraction, and decision-making into their workflows through n8n's MCP Client Tool node. It is equally useful for any MCP-compatible client that supports the Streamable HTTP transport.

## Requirements

- Node.js 20 or newer
- npm
- A valid Clocked API key

## Install

```bash
npm install
```

Copy `.env.example` to `.env`, then set `CLOCKED_API_KEY`.

PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Linux/macOS:

```bash
cp .env.example .env
nano .env
```

Never commit `.env` or share your API key.

## Build and run

```bash
npm run build
npm start
```

Development mode:

```bash
npm run dev
```

By default the service listens on `127.0.0.1:3001` and exposes:

- MCP endpoint: `http://127.0.0.1:3001/mcp`
- Health endpoint: `http://127.0.0.1:3001/health`

The default host is loopback-only for safety. To allow remote connections, set `HOST=0.0.0.0`, configure `MCP_ACCESS_TOKEN`, and place the service behind a TLS-enabled reverse proxy or equivalent secure ingress. Do not expose an unauthenticated server directly to the internet.

## MCP authentication

For local development, `MCP_ACCESS_TOKEN` may be blank. For remote deployment, set a strong random value in `.env`:

```env
MCP_ACCESS_TOKEN=replace-with-a-long-random-secret
```

Clients must then send:

```http
Authorization: Bearer <MCP_ACCESS_TOKEN>
```

This token is separate from `CLOCKED_API_KEY`. The server uses `CLOCKED_API_KEY` only when making outbound requests to Clocked.

## Tool: `clocked_fill`

Arguments:

- `text` (required): source text
- `instructions` (optional): shared instructions
- `fields` (required): Clocked Fill fields object
- `request_id` (optional): idempotency key

The server sends the request to:

`POST https://clocked.rezolve.ai/clocked/fill`

with `Authorization: Bearer ...`, `Idempotency-Key: ...`, and `Content-Type: application/json`.

If `request_id` is omitted, the server creates a UUID. When retrying the same logical request, provide the same `request_id`. Whether a request is deduplicated is determined by Clocked's idempotency behavior.

Use Fill to extract, classify, score, or generate structured fields from free-form text based on field definitions (for example incident metadata such as `incident_id` and `severity`).

## Tool: `clocked_extract`

Arguments:

- `text` (required): source text
- `instructions` (optional): shared instructions
- `fields` (required): Clocked Extract field definitions object
- `request_id` (optional): idempotency key

The server sends the request to:

`POST https://clocked.rezolve.ai/clocked/extract`

with `Authorization: Bearer ...`, `Idempotency-Key: ...`, and `Content-Type: application/json`.

If `request_id` is omitted, the server creates a UUID. When retrying the same logical request, provide the same `request_id`. Whether a request is deduplicated is determined by Clocked's idempotency behavior.

Use Extract to pull specific entities or values from free-form text based on field definitions (for example requester name, product area, start date).

## Tool: `clocked_decide`

Arguments:

- `text` (required): source state text (mapped to the Clocked Decide `state` field)
- `instructions` (optional): shared instructions for the decision process
- `questions` (required): Clocked Decide questions object defining the decision criteria
- `request_id` (optional): idempotency key

The server sends the request to:

`POST https://clocked.rezolve.ai/clocked/decide`

with `Authorization: Bearer ...`, `Idempotency-Key: ...`, and `Content-Type: application/json`.

If `request_id` is omitted, the server creates a UUID. When retrying the same logical request, provide the same `request_id`. Whether a request is deduplicated is determined by Clocked's idempotency behavior.

Each question supports `type` (`noul`, `choice`, `multiselect`, or `score`) plus optional `instructions`, `threshold`, `criteria`, `options`, or `levels` depending on the type.

Use Decide to answer decision questions based on a state description (for example whether to approve a request, assign a priority, or identify affected systems).

## Connect n8n

Use n8n's MCP Client Tool node and configure the Streamable HTTP MCP URL:

`http://127.0.0.1:3001/mcp`

The server exposes three tools: `clocked_fill`, `clocked_extract`, and `clocked_decide`. Select the tool that matches your use case and pass its arguments in the n8n MCP Client Tool node.

If n8n runs on another host or inside a separate environment, `127.0.0.1` points to that environment, not this server. Use a reachable hostname/IP and HTTPS for remote use.

If `MCP_ACCESS_TOKEN` is set, configure the MCP client to send it as a Bearer token. Confirm your installed n8n version supports the server's Streamable HTTP transport and configured authentication.

## Test with MCP Inspector

After starting the server, use MCP Inspector with the endpoint `http://127.0.0.1:3001/mcp`. For example, in a separate terminal:

```bash
npx @modelcontextprotocol/inspector
```

Select the Streamable HTTP transport and enter the MCP endpoint. If authentication is enabled, configure the Bearer token in the Inspector's request headers/authentication options.

### Example: `clocked_fill`

Extract, classify, and score incident metadata from an incident report:

```json
{
  "name": "clocked_fill",
  "arguments": {
    "text": "INC-2026-1042: Payment gateway returned 502 errors for 12 minutes during peak checkout traffic on 2026-10-26. Customers were unable to complete purchases. No latency increase was observed before the failures began.",
    "instructions": "Extract the incident identifier and score the severity using the supplied rubric.",
    "fields": {
      "incident_id": {
        "type": "extract",
        "description": "The incident or ticket identifier",
        "infer": false
      },
      "severity": {
        "type": "score",
        "description": "Assess urgency using the supplied severity rubric",
        "levels": ["Low", "Medium", "High", "Critical"]
      },
      "affected_service": {
        "type": "extract",
        "description": "The service or component affected by the incident"
      },
      "root_cause": {
        "type": "extract",
        "description": "Brief root cause summary if evident from the text"
      }
    },
    "request_id": "fill-inc-2026-1042-001"
  }
}
```

### Example: `clocked_extract`

Pull specific onboarding entities from a new starter request:

```json
{
  "name": "clocked_extract",
  "arguments": {
    "text": "NEW EMPLOYEE ONBOARDING - People Operations Candidate: Amina Rahman Personal contact: amina.rahman@example.com Role: Senior Financial Analyst Office: Manchester Start date: 19 October 2026 Equipment requested: ThinkPad T14, USB-C dock, two 27-inch monitors. Onboarding checklist: - [ ] Contract signed - [ ] IT equipment ordered - [ ] Email account created - [ ] Building access granted - [ ] Line manager: Elena Costa assigned",
    "instructions": "Extract the new starter details and requested equipment items.",
    "fields": {
      "employee": {
        "type": "extract",
        "description": "Current starter full name"
      },
      "role": {
        "type": "extract",
        "description": "Current starter job title"
      },
      "start_date": {
        "type": "extract",
        "description": "Revised start date of the current starter"
      },
      "office": {
        "type": "extract",
        "description": "Office location of the current starter"
      },
      "equipment": {
        "type": "extract",
        "description": "Individual equipment items requested for the current starter",
        "list": true,
        "max_items": 6
      },
      "manager": {
        "type": "extract",
        "description": "Assigned line manager of the current starter; empty if not assigned"
      }
    },
    "request_id": "extract-onboarding-amina-rahman-001"
  }
}
```

### Example: `clocked_decide`

Answer decision questions about an incident state:

```json
{
  "name": "clocked_decide",
  "arguments": {
    "text": "INC-2026-1042: Payment gateway returned 502 errors for 12 minutes during peak checkout traffic. Customers could not complete purchases. The payment service team has been paged and is investigating a configuration change deployed earlier today.",
    "instructions": "Evaluate the incident and recommend approval, priority, and response actions.",
    "questions": {
      "approve_change_rollback": {
        "type": "choice",
        "description": "Whether to roll back the configuration change deployed earlier today",
        "options": ["Yes", "No"]
      },
      "priority": {
        "type": "score",
        "description": "Priority level for this incident",
        "levels": ["Low", "Medium", "High", "Critical"]
      },
      "affected_systems": {
        "type": "multiselect",
        "description": "Systems affected by the incident",
        "options": ["API", "Database", "Frontend", "Payment Gateway"]
      },
      "needs_war_room": {
        "type": "choice",
        "description": "Whether a war room should be opened for this incident",
        "options": ["Yes", "No"]
      }
    },
    "request_id": "decide-inc-2026-1042-001"
  }
}
```

## Fill vs Extract vs Decide

| Area | `clocked_fill` | `clocked_extract` | `clocked_decide` |
|------|---------------|-------------------|------------------|
| Purpose | Extract, classify, score, or generate structured fields from text | Pull specific entities or values from text | Answer decision questions based on a state |
| Clocked endpoint | `/clocked/fill` | `/clocked/extract` | `/clocked/decide` |
| Main input | `fields` object | `fields` object | `questions` object |
| Typical use case | Incident metadata (ID, severity) | Form-like data (names, dates, items) | Approvals, priority, affected systems |

## Notes

- The server implements three tools: `clocked_fill`, `clocked_extract`, and `clocked_decide`, wrapping the respective Clocked APIs.
- The server uses stateless Streamable HTTP; it does not keep conversational session state.
- The health endpoint reports process health only; it does not validate the Clocked API key remotely.
- Do not log API keys or include them in MCP tool arguments.
- Before production deployment, test the SDK/server behavior with your specific MCP clients, enforce HTTPS, set an appropriate request-size limit, and consider rate limiting at the reverse proxy.
