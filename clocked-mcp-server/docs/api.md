# Clocked MCP Server API

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/mcp` | Bearer (`MCP_ACCESS_TOKEN`) if set | Execute a tool (`clocked_fill`, `clocked_extract`, or `clocked_decide`). |
| `GET` | `/health` | none | Liveness probe – returns `{ status: "ok" }`. |
| `POST` | `/api/fill` | Bearer (`MCP_ACCESS_TOKEN`) if set | Fill structured data from free-form text using Clocked AI. |
| `POST` | `/api/extract` | Bearer (`MCP_ACCESS_TOKEN`) if set | Extract structured data from free-form text using Clocked AI. |
| `POST` | `/api/decide` | Bearer (`MCP_ACCESS_TOKEN`) if set | Answer decision questions based on source state using Clocked AI. |

### `POST` /api/fill

Simple REST endpoint for browser UI, `curl`, Postman, and non-MCP applications. Requires client authentication if `MCP_ACCESS_TOKEN` is configured.

#### Request

```json
{
  "text": "The source text to process",
  "fields": {
    "incident_id": {
      "type": "extract",
      "description": "The incident or ticket identifier"
    },
    "severity": {
      "type": "score",
      "levels": ["Low", "Medium", "High", "Critical"]
    }
  },
  "instructions": "Optional instructions for extraction, classification, scoring, or generation",
  "request_id": "Optional idempotency key to reuse on retries"
}
```

#### Realistic Example: Incident Triage

**Scenario:** Triage a payment-gateway incident report and extract key metadata.

```json
{
  "text": "INC-2026-1042: Payment gateway returned 502 errors for 12 minutes during peak checkout traffic on 2026-10-26. Customers were unable to complete purchases. No latency increase was observed before the failures began. The payment service team has been paged and is investigating a configuration change deployed earlier today.",
  "instructions": "Extract the incident ID, assess urgency, name the affected service, and summarize the root cause if evident.",
  "fields": {
    "incident_id": {
      "type": "extract",
      "description": "The incident or ticket identifier",
      "infer": false
    },
    "severity": {
      "type": "score",
      "description": "Urgency level based on customer impact and duration",
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
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | yes | Source text to process. Must be a non-empty string. |
| `fields` | object | yes | Clocked Fill field definitions. Each key is an output field name. |
| `instructions` | string | no | Shared instructions for extraction, classification, scoring, or generation. |
| `request_id` | string | no | Optional idempotency key. Reuse it when retrying the same logical request. |

#### Response

**Success (200):**

```json
{
  "success": true,
  "content": [...],
  "...": "other Clocked Fill response fields"
}
```

**Realistic success response:**

```json
{
  "incident_id": "INC-2026-1042",
  "severity": "Critical",
  "affected_service": "Payment Gateway",
  "root_cause": "Configuration change deployed earlier today"
}
```

**Validation Error (400):**

```json
{
  "error": "Field 'text' is required and must be a non-empty string."
}
// or
{
  "error": "Field 'fields' is required and must be a JSON object."
}
// or
{
  "error": "Field 'instructions' must be a string when provided."
}
// or
{
  "error": "Field 'request_id' must be a string when provided."
}
```

**API Error (502):**

```json
{
  "error": "Clocked API request failed."
}
// or
{
  "isError": true,
  "content": [{ "type": "text", "text": "..." }]
}
```

### `POST` /api/extract

Simple REST endpoint for browser UI, `curl`, Postman, and non-MCP applications. Requires client authentication if `MCP_ACCESS_TOKEN` is configured.

#### Request

```json
{
  "text": "The source text to process",
  "fields": {
    "employee_name": {
      "type": "extract",
      "description": "Full name of the employee"
    },
    "start_date": {
      "type": "extract",
      "description": "Employment start date"
    },
    "office": {
      "type": "extract",
      "description": "Office location"
    }
  },
  "instructions": "Optional instructions for extraction",
  "request_id": "Optional idempotency key to reuse on retries"
}
```

#### Realistic Example: Employee Onboarding

**Scenario:** Pull specific onboarding entities from a new starter request.

```json
{
  "text": "NEW EMPLOYEE ONBOARDING - People Operations Candidate: Amina Rahman Personal contact: amina.rahman@example.com Role: Senior Financial Analyst Office: Manchester Start date: 19 October 2026 Equipment requested: ThinkPad T14, USB-C dock, two 27-inch monitors. Onboarding checklist: - [ ] Contract signed - [ ] IT equipment ordered - [ ] Email account created - [ ] Building access granted - [ ] Line manager: Elena Costa assigned",
  "instructions": "Extract the employee name, role, start date, office location, equipment list, and line manager.",
  "fields": {
    "employee_name": {
      "type": "extract",
      "description": "Full name of the employee"
    },
    "role": {
      "type": "extract",
      "description": "Job title or role"
    },
    "start_date": {
      "type": "extract",
      "description": "Employment start date"
    },
    "office": {
      "type": "extract",
      "description": "Office location"
    },
    "equipment": {
      "type": "extract",
      "description": "Equipment requested",
      "list": true
    },
    "line_manager": {
      "type": "extract",
      "description": "Assigned line manager"
    }
  },
  "request_id": "extract-onboard-2026-001"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | yes | Source text to process. Must be a non-empty string. |
| `fields` | object | yes | Clocked Extract field definitions. Each key is an output field name. |
| `instructions` | string | no | Shared instructions for extraction. |
| `request_id` | string | no | Optional idempotency key. Reuse it when retrying the same logical request. |

#### Response

**Success (200):**

```json
{
  "success": true,
  "content": [...],
  "...": "other Clocked Extract response fields"
}
```

**Realistic success response:**

```json
{
  "employee_name": "Amina Rahman",
  "role": "Senior Financial Analyst",
  "start_date": "19 October 2026",
  "office": "Manchester",
  "equipment": ["ThinkPad T14", "USB-C dock", "two 27-inch monitors"],
  "line_manager": "Elena Costa"
}
```

**Validation Error (400):**

```json
{
  "error": "Field 'text' is required and must be a non-empty string."
}
// or
{
  "error": "Field 'fields' is required and must be a JSON object."
}
// or
{
  "error": "Field 'instructions' must be a string when provided."
}
// or
{
  "error": "Field 'request_id' must be a string when provided."
}
```

**API Error (502):**

```json
{
  "error": "Clocked API request failed."
}
// or
{
  "isError": true,
  "content": [{ "type": "text", "text": "..." }]
}
```

### `POST` /api/decide

Simple REST endpoint for browser UI, `curl`, Postman, and non-MCP applications. Requires client authentication if `MCP_ACCESS_TOKEN` is configured.

#### Request

```json
{
  "text": "The source state to make a decision about",
  "questions": {
    "approve": {
      "type": "choice",
      "description": "Whether to approve the request",
      "options": ["Yes", "No"]
    },
    "priority": {
      "type": "score",
      "description": "Priority level",
      "levels": ["Low", "Medium", "High", "Critical"]
    }
  },
  "instructions": "Optional instructions for the decision process",
  "request_id": "Optional idempotency key to reuse on retries"
}
```

#### Realistic Example: Incident Change Rollback

**Scenario:** Evaluate an incident and recommend whether to roll back a configuration change, assign priority, identify affected systems, and determine if a war room is needed.

```json
{
  "text": "INC-2026-1042: Payment gateway returned 502 errors for 12 minutes during peak checkout traffic on 2026-10-26. Customers were unable to complete purchases. No latency increase was observed before the failures began. The payment service team has been paged and is investigating a configuration change deployed earlier today.",
  "instructions": "Evaluate the incident and recommend whether to roll back the configuration change, assign priority, identify affected systems, and determine if a war room is needed.",
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
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | yes | Source text to process. Must be a non-empty string. |
| `questions` | object | yes | Clocked Decide question definitions. Each key is an output question name. |
| `instructions` | string | no | Shared instructions for the decision process. |
| `request_id` | string | no | Optional idempotency key. Reuse it when retrying the same logical request. |

#### Response

**Success (200):**

```json
{
  "success": true,
  "content": [...],
  "...": "other Clocked Decide response fields"
}
```

**Realistic success response:**

```json
{
  "approve_change_rollback": "Yes",
  "priority": "Critical",
  "affected_systems": ["Payment Gateway", "API"],
  "needs_war_room": "Yes"
}
```

**Validation Error (400):**

```json
{
  "error": "Field 'text' is required and must be a non-empty string."
}
// or
{
  "error": "Field 'questions' is required and must be a JSON object."
}
// or
{
  "error": "Field 'instructions' must be a string when provided."
}
// or
{
  "error": "Field 'request_id' must be a string when provided."
}
```

**API Error (502):**

```json
{
  "error": "Clocked API request failed."
}
// or
{
  "isError": true,
  "content": [{ "type": "text", "text": "..." }]
}
```