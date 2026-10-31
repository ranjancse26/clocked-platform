# Authentication

If `MCP_ACCESS_TOKEN` is set in `.env`, every request to `/mcp` must include:

```http
Authorization: Bearer <MCP_ACCESS_TOKEN>
```

The token is **independent** of the Clocked API key (`CLOCKED_API_KEY`). Rotate it like any other secret and never hard‑code it in client code or logs.