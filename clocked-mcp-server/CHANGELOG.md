# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec.html#summary).

## [0.2.0] - 2026-10-26
- MCP server exposing `clocked_extract` tool over Streamable HTTP
- MCP server exposing `clocked_decide` tool over Streamable HTTP
- REST endpoints `/api/fill`, `/api/extract`, `/api/decide` for direct HTTP access
- Tool contracts documented in `docs/tools.md`
- Playground page for testing all three tools (`clocked_fill`, `clocked_extract`, `clocked_decide`)

## [0.1.0] - 2026-10-26
- Initial release
- MCP server exposing `clocked_fill` tool over Streamable HTTP
- Health endpoint `/health`
- Basic authentication support via `MCP_ACCESS_TOKEN`
- Configuration via `.env` (CLOCKED_API_KEY, MCP_ACCESS_TOKEN, HOST, PORT)