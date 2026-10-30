# System Design with AI — Agent Instructions & Customizations

> **Guiding Principle**: *Build the smallest system that demonstrates the architectural concept correctly. Whenever unsure whether to add or cut something, this is the tiebreaker.*  
> **Master References**:
> - Architectural Specification: [`docs/architecture.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/architecture.md)
> - Master Execution Plan: [`docs/implementation-plan.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/implementation-plan.md)
> - Technical Decisions Log: [`docs/decision.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/decision.md)
> - Master Product Roadmap: [`docs/system-design-tool-roadmap.pdf`](file:///d:/Major%20Project/System-Design-with-AI/docs/system-design-tool-roadmap.pdf)
> - Stage Guides & Walkthroughs: [`docs/stages/`](file:///d:/Major%20Project/System-Design-with-AI/docs/stages/)
> - UI/UX Design System: [`design-system/system-design-studio/MASTER.md`](file:///d:/Major%20Project/System-Design-with-AI/design-system/system-design-studio/MASTER.md)

This repository enforces strict engineering discipline, architectural constraints, and visual excellence:

---

## 1. Ponytail (Engineering Discipline)
- **Channel a lazy, battle-tested senior developer**:
  - The best code is the code never written.
  - **The Ladder**:
    1. Does this need to exist at all? (YAGNI)
    2. Already in this codebase? Reuse existing helpers/types.
    3. Stdlib does it? Use it.
    4. Native platform feature covers it? Use it (CSS over JS, DB constraints over app code).
    5. Already installed dependency solves it? Use it.
    6. Minimum code that works.
  - **No speculative abstractions**: No 1-implementation interfaces, no unnecessary microservices, no premature factories.
  - **Shortest working diff**: Deletion over addition.

---

## 2. UI/UX Pro Max (Visual & Interaction Excellence)
- **Visual Aesthetic**:
  - Precision Developer Tool & Architecture Studio aesthetic.
  - Deep OLED dark mode (`#0b0f19`, `#0f172a`), refined borders (`border-slate-800`), glassmorphism backdrop blur.
  - Color-coded architectural categories:
    - **Clients**: Emerald (`#10b981`)
    - **Gateways**: Cyan (`#06b6d4`)
    - **Microservices**: Violet (`#8b5cf6`)
    - **Databases**: Blue (`#3b82f6`)
    - **Caches**: Fuchsia (`#d946ef`)
    - **Queues / Streaming**: Amber (`#f59e0b`)
- **Usability & Standards**:
  - Contrast ratio $\ge 4.5:1$ across all text elements.
  - No emojis as functional icons — only official SVG vectors (`lucide-react`, `react-icons`).
  - Active `cursor-pointer`, smooth transitions ($150\text{ms}-300\text{ms}$), and keyboard focus accessibility.

---

## 3. Implementation Rules & Coding Discipline
Every agent and developer working in this repository MUST strictly abide by these rules:

1. **Write Only Required Code**: Implement only what is explicitly requested by the roadmap and [`docs/implementation-plan.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/implementation-plan.md).
2. **Short, Simple & Readable**: Keep functions focused, modular, and small ($<50$ lines when practical).
3. **Zero Extra / Dead Code**: Never write speculative features, unused parameters, unused exports, or dead code paths.
4. **No Unnecessary Abstractions or Dependencies**: Do not introduce new libraries, wrappers, or microservices without explicit justification.
5. **Follow Existing Architecture & Folder Structure**:
   - Frontend components live in [`client/src/components/`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/).
   - Backend modules live in [`server/src/`](file:///d:/Major%20Project/System-Design-with-AI/server/src/).
   - Relational schema lives in [`server/prisma/schema.prisma`](file:///d:/Major%20Project/System-Design-with-AI/server/prisma/schema.prisma).
6. **Reuse Existing Code First**: Always check existing services (`AiService`, `MetricsService`, `ProjectsService`, `api.ts`) and types before creating new ones.
7. **Do Not Change Working Code**: Never refactor working, tested components unless required to fulfill a phase task.
8. **High-Signal Comments Only**: Write comments only to explain non-obvious algorithms (e.g. DFS recursion in cycle detection, graph math) — never restate what the code does.
9. **Test After Each Phase**: Every phase must be verified and tested (compiles cleanly, unit/integration checks pass) before advancing to the next phase.
10. **TBD Over Guesswork**: If a detail or requirement is missing from the roadmap, mark it as **`TBD`** instead of inventing behaviors or technologies.
11. **Zero-Key Exposure (Mandatory Pre-Push Audit)**: Never let an API key sit inside your code. Every key goes in an `.env` file. Before you push anything to GitHub, search the entire project for the word `key` (via `npm run check:keys` or `python scripts/scan_keys.py`) and make sure none of them are visible.

---

## 4. Architectural Non-Negotiables

1. **Deterministic Before AI**:
   - Order of execution: `Metrics Engine → Rule Engine → RAG → LLM Reasoning`.
   - Never call an LLM to count nodes, find cycles, or calculate SPOFs — compute them deterministically using graph algorithms.
2. **AI Never Sees Raw Canvas JSON**:
   - Raw React Flow data with pixel coordinates ($x, y$) and UI styles must pass through the [`DomainNormalizerUtil`](file:///d:/Major%20Project/System-Design-with-AI/server/src/domain/domain-normalizer.util.ts) into a normalized `DomainGraph` before feeding the metrics engine or AI prompt.
3. **Exact Metrics Output Contract**:
   - All engines and downstream phases must consume and produce the exact contract defined in [`domain-model.interface.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/domain/domain-model.interface.ts):
     `{ services, databases, caches, queues, spof, fanOut, redundancyScore, cycles, warnings }`.
4. **Zero-Crash Graceful Degradation**:
   - If an external LLM times out ($>9\text{s}$) or fails, the API must return deterministic results with:
     `"AI analysis unavailable. Showing deterministic analysis."`
   - External provider failures must never cause HTTP 500 crashes or blank client screens.
5. **Provider-Agnostic LLM Interface**:
   - All model calls route through `callLLM(prompt: string)` in [`AiService`](file:///d:/Major%20Project/System-Design-with-AI/server/src/ai/ai.service.ts). Swapping between Gemini, Groq, OpenAI, or Ollama must be a single configuration change (`LLM_PROVIDER`), not a code refactor.
6. **Asynchronous Execution Boundary**:
   - If an operation takes $\ge 1\text{s}$ or does not require an immediate synchronous UI response, route it through the **Redpanda** message broker; otherwise keep it synchronous.
7. **Deliberately Excluded (Do Not Add)**:
   - No separate API Gateway microservice (use NestJS controller/BFF).
   - No full enterprise RBAC (use resource ownership `userId` + `isAdmin` flag).
   - No CRDT multi-user collaborative editing (permanently excluded).
   - No Kubernetes manifests or Grafana dashboards unless all core phases are finished early.

---

## 5. Frozen Tech Stack
Do not add alternative frameworks or tools:
* **Frontend**: React 19, TypeScript, Vite, `@xyflow/react` v12, Tailwind CSS v4, Axios.
* **Backend**: Node.js, TypeScript, NestJS 11, Prisma ORM, `@nestjs/swagger`, `class-validator`.
* **Database & Search**: PostgreSQL 16 with `pgvector` extension.
* **Cache & Rate Limit**: Redis 7.
* **Queue / Streaming**: Redpanda (Kafka protocol).
* **Containerization**: Docker Compose (`docker/docker-compose.yml`).
* **CI/CD**: GitHub Actions.
* **Default Dev LLM**: Google Gemini free tier / Groq (`llama-3.1-8b-instant`).

---

## 6. Up-to-Date Library Documentation (Context7 MCP)
- **Use Context7 for Documentation Retrieval**:
  - For external library APIs, configuration structures, and breaking changes (e.g. `@xyflow/react` v12, React 19, Tailwind CSS v4, NestJS 11, Prisma 5, Socket.IO, KafkaJS, ioredis), query Context7 MCP tools (`resolve-library-id` and `query-docs`) before writing code.
  - Context7 MCP server endpoint: `https://mcp.context7.com/mcp` (configured in `~/.gemini/config/mcp_config.json`).
  - Secure credentials via `CONTEXT7_API_KEY` environment variable. Never hardcode API keys.

