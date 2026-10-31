# Operations

- **Default bind:** `127.0.0.1:3001`
- **Remote access:** set `HOST=0.0.0.0` in `.env` and place the service behind a TLS‑terminating reverse proxy (Traefik, Caddy, NGINX).
- **Health check:** `GET http(s)://<host>/health` – returns `{ status: "ok" }`.
- **Rate limiting:** recommended at the proxy (e.g., 100 req/min per IP) to protect the upstream Clocked API.
- **Logging:** structured JSON; secrets are never written to logs.MCP_ACCESS_TOKEN=... your-image`
- **Maximum payload size:** default limit ~10 MB; adjust via server flags if needed.