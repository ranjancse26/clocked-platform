# About Clocked MCP Server

The **Clocked MCP Server** is a standalone TypeScript MCP (Model Context Protocol) server that exposes the Clocked Fill, Extract, and Decide APIs from Rezolve.ai over Streamable HTTP. It runs directly on Node.js.

Instead of calling the Clocked REST endpoints directly, MCP-compatible clients such as n8n, Claude Desktop, Cursor, and other Model Context Protocol hosts discover and invoke three standardized MCP tools over a single Streamable HTTP endpoint (`/mcp`). The server translates each MCP tool call into an authenticated HTTP request to the corresponding Clocked API:

| MCP Tool | Clocked API Endpoint | Purpose |
|----------|----------------------|---------|
| `clocked_fill` | `POST /clocked/fill` | Extracts, classifies, scores, or generates structured fields from free-form text based on a `fields` definition object. |
| `clocked_extract` | `POST /clocked/extract` | Pulls specific entities or values from free-form text based on `fields` definitions (form-like data such as names, dates, and items). |
| `clocked_decide` | `POST /clocked/decide` | Answers decision questions based on a state description and a `questions` definition object (approvals, priority, affected systems). |

## Creator

The Clocked MCP Server was built by **Ranjan Dailata**, Co-Founder at [MachinaOne](https://machinaone.com/) and Enterprise Architect at [Aezion Inc](https://www.aezion.com) based in India, specialized in AI-powered automations.

Ranjan is an [n8n Creator](https://n8n.io/creators/ranjancse/) (@ranjancse) and an [ADPList mentor](https://adplist.org/mentors/ranjan-dailata), with expertise spanning engineering design, full-stack development, product, AI/ML, advanced data analytics, critical thinking, and leadership.

- **LinkedIn:** [https://www.linkedin.com/in/ranjan-dailata/](https://www.linkedin.com/in/ranjan-dailata/)
- **GitHub:** [https://github.com/ranjancse26](https://github.com/ranjancse26)

## Repository & License

- **Repository:** [github.com/ranjancse26/clocked-mcp-server](https://github.com/ranjancse26/clocked-platform/clocked-mcp-server)
- **License:** MIT

## Related Documentation

- [API Reference](./api.md) — Endpoints, request/response formats, authentication.
- [Tools](./tools.md) — Tool contracts (`clocked_fill`, `clocked_extract`, `clocked_decide`).
- [Authentication](./authentication.md) — Bearer token usage and best practices.
- [Operations](./ops.md) — Binding, TLS, health checks, rate limiting.
- [Clocked Playground](./playground.html) — Playground for Clocked Fill, Extract and Decide.
