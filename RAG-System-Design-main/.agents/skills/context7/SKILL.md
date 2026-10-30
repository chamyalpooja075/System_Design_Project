---
name: context7
description: Use Context7 MCP tools (resolve-library-id and query-docs) to retrieve real-time, version-specific library documentation, API signatures, and official code examples.
---

# Context7 Documentation Skill

Use this skill whenever you need authoritative, up-to-date documentation or code snippets for third-party libraries, frameworks, SDKs, or tools used in this codebase (e.g. `@xyflow/react`, NestJS, Prisma, Tailwind CSS, Redis, KafkaJS).

## Usage Procedure

### 1. Resolve Library ID
Call the MCP tool `resolve-library-id` with:
- `libraryName`: Name of the library or package (e.g. `Prisma`, `NestJS`, `React Flow`).
- `query`: A concise summary of what you are implementing or searching for.

### 2. Query Documentation
Call the MCP tool `query-docs` with:
- `libraryId`: The resolved ID returned in Step 1 (format: `/org/project` or `/org/project/version`).
- `query`: The specific concept or API method to look up (e.g. `NestJS Redis microservice connection options`).
- `language`: `TypeScript` or `JavaScript` where applicable.

## Server Connection Details
- **Endpoint**: `https://mcp.context7.com/mcp`
- **Global Config**: `~/.gemini/config/mcp_config.json`
- **Environment Variable**: `CONTEXT7_API_KEY` (optional, for higher rate limits and private packages)
