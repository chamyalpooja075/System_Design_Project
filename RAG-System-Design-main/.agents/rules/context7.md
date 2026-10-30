---
trigger: always_on
description: Consult Context7 MCP tools for up-to-date library documentation, API references, and version-specific implementation guidance.
---

## Context7 Documentation MCP

When writing, refactoring, or verifying code that interacts with external frameworks, libraries, SDKs, or tools (e.g., `@xyflow/react` v12, React 19, Tailwind CSS v4, NestJS 11, Prisma 5, Socket.IO, KafkaJS, ioredis):

### Rules:
1. **Never Guess API Signatures or Version Nuances**:
   - Query Context7 whenever working with external library APIs, configuration structures, or version migration patterns.
   - Do not rely on outdated training memory for rapid-release libraries (such as `@xyflow/react` v12 or Tailwind CSS v4).
2. **Two-Step Tool Flow**:
   - **Step 1 (`resolve-library-id`)**: Resolve the exact package name to a Context7 library ID (e.g., `libraryName: "Prisma"`, `query: "Prisma schema sqlite"`).
   - **Step 2 (`query-docs`)**: Query specific documentation using the resolved `libraryId` and a focused conceptual query.
3. **Respect Frozen Tech Stack Versions**:
   - React 19, Tailwind CSS v4, NestJS 11, `@xyflow/react` v12, Prisma 5.
   - Request documentation matching these target versions.
4. **Credential Security**:
   - Context7 connects to `https://mcp.context7.com/mcp`.
   - Any private or high-quota API key must come from the `CONTEXT7_API_KEY` environment variable. Never hardcode keys in codebase files, commits, or configuration files.
