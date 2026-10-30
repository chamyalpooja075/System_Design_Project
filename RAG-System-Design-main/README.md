# System Design with AI — Architecture Studio & Interview Platform

> **Guiding Principle**: *Build the smallest system that demonstrates the architectural concept correctly. Whenever unsure whether to add or cut something, this is the tiebreaker.*

A full-stack, developer-focused platform where software engineers visually diagram distributed systems and receive instant, AI-driven critique grounded in **deterministic graph algorithms**, **pgvector RAG**, and an interactive **Live Interview Mode**.

---

## 📚 Master Documentation & Specifications

All core architectural blueprints, execution roadmaps, and stage walkthroughs are organized inside the [**`docs/`**](file:///d:/Major%20Project/System-Design-with-AI/docs/) directory:

| Document | Location | Purpose |
| :--- | :--- | :--- |
| **System Architecture** | [**`docs/architecture.md`**](file:///d:/Major%20Project/System-Design-with-AI/docs/architecture.md) | Complete architectural specification, contracts, and flow diagrams |
| **Master Implementation Plan** | [**`docs/implementation-plan.md`**](file:///d:/Major%20Project/System-Design-with-AI/docs/implementation-plan.md) | Step-by-step roadmap execution plan (Phases 1 through 8) |
| **Technical Decisions Log** | [**`docs/decision.md`**](file:///d:/Major%20Project/System-Design-with-AI/docs/decision.md) | Architectural and technical decisions with rationale & alternatives |
| **Product Roadmap** | [**`docs/system-design-tool-roadmap.pdf`**](file:///d:/Major%20Project/System-Design-with-AI/docs/system-design-tool-roadmap.pdf) | Original 11-page master roadmap PDF |
| **Phase Walkthroughs** | [**`docs/stages/`**](file:///d:/Major%20Project/System-Design-with-AI/docs/stages/) | Beginner-friendly guides for completed implementation phases (`phase1.md`, `phase2.md`, `phase3.md`, `phase4.md`) |
| **Architectural Knowledge Base** | [**`docs/knowledge-base/`**](file:///d:/Major%20Project/System-Design-with-AI/docs/knowledge-base/) | 15 curated distributed systems reference documents for RAG grounding |
| **Architecture Decision Records** | [**`docs/adr/`**](file:///d:/Major%20Project/System-Design-with-AI/docs/adr/) | Significant technical decisions (`ADR-001-monorepo-and-core-stack.md`) |
| **Agent Instructions** | [**`AGENTS.md`**](file:///d:/Major%20Project/System-Design-with-AI/AGENTS.md) | Coding discipline, Ponytail philosophy, and architectural constraints |
| **UI/UX Design System** | [**`design-system/system-design-studio/MASTER.md`**](file:///d:/Major%20Project/System-Design-with-AI/design-system/system-design-studio/MASTER.md) | OLED dark mode design tokens, typography, and component styling |

---

## 🏗️ Repository Layout

```
system-design-with-ai/
├── client/                        # Frontend Application (React 19 + TypeScript + Vite + @xyflow/react)
├── server/                        # Backend Application (NestJS 11 + TypeScript + Prisma ORM)
├── docker/
│   └── docker-compose.yml         # PostgreSQL 16 (pgvector), Redis 7, Redpanda
├── docs/                          # Master Documentation & Blueprints
│   ├── architecture.md            # System Architecture Blueprint
│   ├── implementation-plan.md     # Phase 1-8 Master Implementation Plan
│   ├── system-design-tool-roadmap.pdf # Product Roadmap PDF
│   ├── knowledge-base/            # 15 Architectural Knowledge Base Reference Guides
│   ├── adr/                       # Architecture Decision Records
│   └── stages/                    # Stage-by-Stage Implementation Guides
├── design-system/                 # Studio UI Tokens & Design Guidelines
├── AGENTS.md                      # Engineering Rules & Agent Guidelines
└── package.json                   # Root workspaces configuration
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: $\ge 20.x$
- **npm**: $\ge 10.x$
- **Docker Desktop**: Running locally

### 2. Start Local Infrastructure
```bash
docker compose -f docker/docker-compose.yml up -d
```
Starts:
- **PostgreSQL 16 with pgvector** on `localhost:5432`
- **Redis 7** on `localhost:6379`
- **Redpanda (Kafka)** on `localhost:19092`

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Add `GEMINI_API_KEY` or `GROQ_API_KEY` for live LLM reasoning; deterministic fallback works automatically with zero keys).*

### 5. Launch Development Servers
```bash
npm run dev
```
- **Frontend Canvas Studio**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Interactive Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
