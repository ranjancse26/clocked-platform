#!/usr/bin/env bash
# Example cURL call to the Clocked MCP server
# Prerequisites:
#   - Server running on http://127.0.0.1:3001 (or your host)
#   - MCP_ACCESS_TOKEN set (optional; remove -H if not used)

BASE_URL="http://127.0.0.1:3001/mcp"
TOKEN="${MCP_ACCESS_TOKEN:-}"   # set env var or empty

# ── Fill example ──────────────────────────────────────────────────────────────
curl -s -X POST "$BASE_URL/fill" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
  -d '{
          "text": "Sample incident description: Server crashed during peak load.",
          "fields": {
            "incident_id": {
              "type": "extract",
              "description": "The incident or ticket identifier",
              "infer": false
            },
            "severity": {
              "type": "score",
              "description": "Urgency level",
              "levels": ["Low","Medium","High","Critical"]
            }
          }
      }'

# ── Extract example ─────────────────────────────────────────────────────────
curl -s -X POST "$BASE_URL/extract" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
  -d '{
          "text": "NEW STARTER · People Operations\nCandidate: Amina Rahman\nPersonal contact: amina.rahman@example.com\nRole: Senior Financial Analyst\nOffice: Manchester\nOriginal start date: 19 October 2026\nEquipment requested: ThinkPad T14, USB-C dock, two 27-inch monitors.",
          "fields": {
            "employee": "Current starter full name",
            "role": "Current starter job title",
            "start_date": "Revised start date of the current starter",
            "office": "Office location of the current starter",
            "equipment": {
              "description": "Individual equipment items requested for the current starter",
              "list": true,
              "max_items": 6
            },
            "manager": "Assigned line manager of the current starter; empty if not assigned"
          }
      }'

# ── Decide example ──────────────────────────────────────────────────────────
CLOCKED_REQUEST_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
curl -s -X POST "$BASE_URL/decide" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Idempotency-Key: $CLOCKED_REQUEST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
          "state": "The entire finance team loses its VPN connection every five minutes. Payroll must be submitted today. There is no workaround. The manager approved an emergency network change.",
          "instructions": "Urgent means a team is blocked against a same-day business deadline without a workaround. Count approval only when it is explicitly stated.",
          "questions": {
            "approved": {
              "type": "noul",
              "instructions": "Has the manager approved the emergency change?",
              "threshold": 0.75
            },
            "route": {
              "type": "choice",
              "instructions": "Which team should own the issue?",
              "criteria": {
                "network": "VPN and connectivity",
                "hardware": "Physical devices",
                "identity": "Password or account problems"
              }
            },
            "impacts": {
              "type": "multiselect",
              "instructions": "Which impacts are explicitly present?",
              "criteria": {
                "team_blocked": "Multiple people cannot work normally.",
                "deadline": "A business deadline is at risk today.",
                "data_loss": "Files or records have been lost."
              },
              "threshold": 0.65
            },
            "priority": {
              "type": "score",
              "instructions": "Rate the incident priority.",
              "criteria": [
                "Low: routine request",
                "Medium: one person affected with a workaround",
                "High: a team blocked with a same-day deadline"
              ]
            }
          }
      }'