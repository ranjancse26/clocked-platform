# Tool: `clocked_fill`

Extracts, classifies, scores, or generates structured fields from free-form text based on a `fields` definition object. Use `clocked_fill` when you need to turn unstructured text (incident reports, emails, chat transcripts, support tickets) into structured data such as IDs, severity scores, affected services, root causes, and more.

## When to use

- Classify an incident by urgency (score)
- Extract a ticket or incident identifier (extract)
- Identify affected services, root cause, or business impact from a narrative description
- Generate a short summary or suggested next steps from raw text

## Realistic request example

**Scenario:** Triage a payment-gateway incident report and extract key metadata.

```json
{
  "name": "clocked_fill",
  "arguments": {
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
}
```

## Realistic success response

```json
{
  "incident_id": "INC-2026-1042",
  "severity": "Critical",
  "affected_service": "Payment Gateway",
  "root_cause": "Configuration change deployed earlier today"
}
```

## Realistic error response

```json
{
  "error": "Clocked Fill API returned an HTTP error.",
  "request_id": "fill-inc-2026-1042-001",
  "status": 401,
  "details": "Invalid API key"
}
```

## Field types supported in `fields`

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"extract"` | Pull a specific value or entity verbatim from the text. Set `"infer": false` to disable guessing when the value is not explicitly present. |
| `type` | `"score"` | Assign one of the listed `levels` (e.g. `["Low", "Medium", "High", "Critical"]`). |
| `infer` | `boolean` | When `false`, the model will not hallucinate a value if it cannot find one in the source text. |
| `levels` | `string[]` | Allowed score levels for a `score` field. |
| `list` | `boolean` | When `true`, the field returns an array of items. |
| `max_items` | `number` | Maximum number of items to return for a `list` field. |

---

# Tool: `clocked_extract`

Pulls specific entities or values from free-form text based on `fields` definitions. Use `clocked_extract` for form-like data such as names, dates, office locations, equipment lists, and manager assignments.

## When to use

- Onboarding/offboarding forms (employee name, role, start date, office, equipment, manager)
- Invoice or expense parsing (vendor, amount, date, PO number)
- Customer support details (contact name, email, product, serial number)
- Any scenario where you need to pull discrete, named values out of a paragraph

## Realistic request example

**Scenario:** Extract new-starter onboarding details from an HR request.

```json
{
  "name": "clocked_extract",
  "arguments": {
    "text": "NEW EMPLOYEE ONBOARDING - People Operations\nCandidate: Amina Rahman\nPersonal contact: amina.rahman@example.com\nRole: Senior Financial Analyst\nOffice: Manchester\nOriginal start date: 19 October 2026\nEquipment requested: ThinkPad T14, USB-C dock, two 27-inch monitors.\nOnboarding checklist:\n- [ ] Contract signed\n- [ ] IT equipment ordered\n- [ ] Email account created\n- [ ] Building access granted\n- [ ] Line manager: Elena Costa assigned",
    "instructions": "Pull the new starter's full name, job title, start date, office, requested equipment items, and assigned line manager.",
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

## Realistic success response

```json
{
  "employee": "Amina Rahman",
  "role": "Senior Financial Analyst",
  "start_date": "2026-10-19",
  "office": "Manchester",
  "equipment": [
    "ThinkPad T14",
    "USB-C dock",
    "two 27-inch monitors"
  ],
  "manager": "Elena Costa"
}
```

## Realistic error response

```json
{
  "error": "Clocked Extract API returned an HTTP error.",
  "request_id": "extract-onboarding-amina-rahman-001",
  "status": 422,
  "details": "Unprocessable entity: fields schema is invalid"
}
```

---

# Tool: `clocked_decide`

Answers decision questions based on a state description and a `questions` definition object. Use `clocked_decide` for approvals, priority assignments, routing, war-room decisions, and affected-system identification.

## When to use

- Approve or reject a change rollback
- Assign incident priority
- Identify affected systems (multiselect)
- Decide whether to open a war room
- Route tickets to the correct team (choice)

## Realistic request example

**Scenario:** Decide incident response actions for a payment-gateway outage.

```json
{
  "name": "clocked_decide",
  "arguments": {
    "text": "INC-2026-1042: Payment gateway returned 502 errors for 12 minutes during peak checkout traffic. Customers could not complete purchases. The payment service team has been paged and is investigating a configuration change deployed earlier today.",
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
}
```

## Realistic success response

```json
{
  "approve_change_rollback": "Yes",
  "priority": "Critical",
  "affected_systems": ["Payment Gateway", "API"],
  "needs_war_room": "Yes"
}
```

## Realistic error response

```json
{
  "error": "Clocked Decide API returned an HTTP error.",
  "request_id": "decide-inc-2026-1042-001",
  "status": 500,
  "details": "Internal server error"
}
```

## Question types supported in `questions`

| Type | Description | Required fields |
|------|-------------|-----------------|
| `choice` | Pick one value from `options`. | `options` |
| `multiselect` | Pick zero or more values from `options`. | `options` |
| `score` | Assign one level from `levels`. | `levels` |
| `noul` | Binary yes/no judgment with an optional `threshold` (0–1). | `instructions`, `threshold` (optional) |
| `instructions` | `string` | Shared hints for the decision process. |
| `threshold` | `number` | Confidence threshold (0–1) for `noul` questions. |
| `criteria` | `Record<string, string>` or `string[]` | Rules the model should apply when answering. |

## Common properties

### `text` (required)
The free-form source text, incident report, form content, or state description to process.

### `instructions` (optional)
Shared guidance applied across all fields or questions. Helps the model interpret ambiguous text consistently.

### `request_id` (optional)
Idempotency key. Reuse the same `request_id` when retrying the same logical request. If omitted, the server generates a UUID. Whether a request is deduplicated is determined by Clocked's idempotency behavior.

### Errors
All three tools wrap errors in `{ error: "..." }` with an appropriate HTTP status code. The `request_id` and `status` are included when available to help with debugging.

## Fill vs Extract vs Decide

| Area | `clocked_fill` | `clocked_extract` | `clocked_decide` |
|------|---------------|-------------------|------------------|
| Purpose | Extract, classify, score, or generate structured fields from text | Pull specific entities or values from text | Answer decision questions based on a state |
| Clocked endpoint | `/clocked/fill` | `/clocked/extract` | `/clocked/decide` |
| Main input | `fields` object | `fields` object | `questions` object |
| Typical use case | Incident metadata (ID, severity, root cause) | Form-like data (names, dates, items) | Approvals, priority, affected systems |