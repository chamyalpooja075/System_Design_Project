# System Design Interview Tool — Architecture & Technical Decisions

> **Guiding Principle**: *Build the smallest system that demonstrates the architectural concept correctly. Whenever unsure whether to add or cut something, this is the tiebreaker.*  
> **Master References**: [`docs/architecture.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/architecture.md), [`docs/implementation-plan.md`](file:///d:/Major%20Project/System-Design-with-AI/docs/implementation-plan.md), and [`docs/system-design-tool-roadmap.pdf`](file:///d:/Major%20Project/System-Design-with-AI/docs/system-design-tool-roadmap.pdf)

---

## Decision: Monorepo Architecture with npm Workspaces

**Decision:** Adopt an npm workspaces monorepo housing both the frontend (`client/`) and backend (`server/`) in a single repository.

**Reason:** Enables synchronized builds (`npm run build`), single-command dependency management (`npm install`), shared contract alignment, and zero overhead compared to multi-repository synchronization.

**Alternatives:** Polyrepo (separate GitHub repos for client and server), Turborepo/Nx (rejected as premature tooling overhead for a solo project).

**Status:** Accepted

---

## Decision: Modular Monolith over Microservices

**Decision:** Build the backend as a modular monolith in NestJS 11 with strictly defined internal module boundaries (`auth`, `projects`, `diagrams`, `domain`, `metrics`, `ai`).

**Reason:** Avoids network latency, serialized RPC overhead, container orchestration complexity, and distributed failure modes while preserving clean code modularity and independent testability.

**Alternatives:** Microservice architecture with separate network services for Auth, Metrics, and AI.

**Status:** Accepted

---

## Decision: React Flow Canvas Engine

**Decision:** Use `@xyflow/react` v12 for the interactive architecture whiteboard canvas.

**Reason:** Delivers battle-tested zooming, infinite panning, curved bezier edge routing, magnetic handle connections, and minimap support out of the box, saving months of custom HTML5 canvas math.

**Alternatives:** HTML5 Canvas / WebGL from scratch, Fabric.js, Konva.js.

**Status:** Accepted

---

## Decision: Normalized Domain Model Decoupled from Canvas JSON

**Decision:** Strip all UI screen coordinates ($x, y$), visual drag states, and CSS styles via `DomainNormalizerUtil` to produce a pure, UI-agnostic `DomainGraph` before downstream processing.

**Reason:** Prevents backend graph math and AI prompts from depending on frontend UI shapes, reduces LLM token consumption by over 70%, and ensures frontend canvas changes never break analysis engines.

**Alternatives:** Passing raw React Flow JSON directly into graph algorithms and AI prompts.

**Status:** Accepted

---

## Decision: Deterministic Graph Traversal Before AI

**Decision:** Execute graph traversal algorithms (DFS cycle detection, SPOF detection, fan-out calculations) and deterministic rules before invoking any LLM (`Metrics Engine → Rule Engine → RAG → LLM Reasoning`).

**Reason:** LLMs frequently hallucinate structural facts (miscounting nodes, missing cyclic dependencies, hallucinating database connections). Deterministic graph algorithms provide a guaranteed, mathematically correct baseline with zero latency and zero token cost.

**Alternatives:** Prompting an LLM directly to analyze raw architecture diagrams.

**Status:** Accepted

---

## Decision: Zero-Crash Graceful Degradation Contract

**Decision:** If an external LLM call times out ($>9\text{s}$), exceeds quota, or fails, the backend immediately catches the error and returns deterministic graph results with the message: `"AI analysis unavailable. Showing deterministic analysis."`

**Reason:** External AI API failures must never cause HTTP 500 crashes, blank screens, or broken user experiences. Graceful degradation is a core specification requirement.

**Alternatives:** Throwing an unhandled exception or returning a generic error page.

**Status:** Accepted

---

## Decision: Provider-Agnostic LLM Interface (`callLLM`)

**Decision:** Encapsulate all model interactions behind a single `callLLM(prompt: string)` interface in `AiService`, swappable via `LLM_PROVIDER` in environment configuration.

**Reason:** Allows switching seamlessly between Google Gemini 1.5 Flash (free default), Groq (`llama-3.1-8b-instant`), OpenAI (`gpt-4o-mini`), and local Ollama (`Llama 3.1 8B`) without refactoring any business logic.

**Alternatives:** Hardcoding provider-specific SDKs (e.g. LangChain, direct OpenAI SDK) throughout the codebase.

**Status:** Accepted

---

## Decision: PostgreSQL 16 with pgvector for Relational and Semantic Storage

**Decision:** Use PostgreSQL 16 with the `pgvector` extension for users, projects, versioned diagrams, and RAG knowledge base embeddings.

**Reason:** Eliminates the operational and financial cost of maintaining a separate vector database (like Pinecone or Milvus) by co-locating relational data and vector similarity search in a single ACID-compliant database.

**Alternatives:** Separate vector DB service (Pinecone, Qdrant, Milvus), MongoDB/NoSQL.

**Status:** Accepted

---

## Decision: Redpanda (Kafka-compatible) for Asynchronous Processing

**Decision:** Use Redpanda as the message broker for asynchronous jobs exceeding synchronous timeout boundaries ($\ge 1\text{s}$, e.g. heavy AI analysis and simulation jobs).

**Reason:** Fully compatible with the Kafka protocol while running as a single lightweight C++ binary with no JVM/ZooKeeper overhead, offering low resource utilization locally in Docker and in production.

**Alternatives:** Apache Kafka (JVM overhead too heavy for local dev), RabbitMQ, AWS SQS, synchronous blocking HTTP requests.

**Status:** Accepted (Implemented in Phase 5)


---

## Decision: Redis for In-Memory Caching and Rate Limiting

**Decision:** Use Redis 7 to cache repeat AI evaluation responses (keyed by normalized domain graph SHA-256 hash) and enforce sliding-window API rate limits, with an automated in-memory TTL map fallback when Redis is offline.

**Reason:** Satisfies the NFR target of $<200\text{ms}$ latency for repeated queries ($<20\text{ms}$ measured) and protects external LLM quota limits from spam or abuse without crashing if Redis is offline.

**Alternatives:** In-memory Node.js process maps alone (fails across horizontal scaling), Memcached.

**Status:** Accepted (Implemented in Phase 3)

---

## Decision: WebSockets for Progressive Architectural Analysis Feedback

**Decision:** Use Socket.io on namespace `/ws/analysis` to stream staged milestone status events (`TOPOLOGY`, `RULES`, `STRATEGY`, `SYNTHESIS`) during diagram critique.

**Reason:** Keeps users engaged during multi-second evaluations, showing the exact pipeline stages without wasteful HTTP polling.

**Alternatives:** Long-polling, Server-Sent Events (SSE).

**Status:** Accepted (Implemented in Phase 3)

---

## Decision: Resource Ownership over Enterprise RBAC

**Decision:** Implement security using strict resource ownership (`project.userId === user.id`) paired with an optional `isAdmin` boolean flag.

**Reason:** Full enterprise Role-Based Access Control (RBAC with permissions matrices, roles, and tenant inheritance) is unnecessary complexity for a portfolio platform and violates YAGNI.

**Alternatives:** Full enterprise RBAC tables (Roles, Permissions, UserRoles, RolePermissions).

**Status:** Accepted

---

## Decision: Backend-For-Frontend (BFF) Middleware over Dedicated API Gateway

**Decision:** Handle routing, JWT validation, rate limiting, and CORS directly within NestJS controllers and guards.

**Reason:** Adding a separate API Gateway service (such as Kong or KrakenD) introduces an unnecessary network hop, operational overhead, and deployment complexity for a single client frontend.

**Alternatives:** Standalone Kong, KrakenD, or Traefik API Gateway microservice.

**Status:** Accepted

---

## Decision: Fixed Scoring Rubric for Interview Mode

**Decision:** Anchor the AI Interviewer evaluation to a predetermined, fixed 6-category weighted rubric: Availability (25%), Scalability (25%), Reliability (20%), Performance (15%), Security (10%), Cost Awareness (5%).

**Reason:** Prevents arbitrary or fluctuating score variances between interview runs, ensuring objective, explainable, and reproducible candidate scores from 1 to 10.

**Alternatives:** Open-ended, unconstrained LLM grading without fixed numerical weighting.

**Status:** Accepted (Scheduled for Phase 6)

---

## Decision: Permanent Exclusion of CRDT Multi-User Collaborative Editing

**Decision:** Explicitly exclude real-time multi-cursor multi-user diagram editing (CRDTs / Operational Transformation).

**Reason:** Multi-user collaborative synchronization increases architectural complexity exponentially without supporting the primary objective: preparing individual candidates for 1-on-1 system design interviews.

**Alternatives:** Yjs, Automerge, Liveblocks.

**Status:** Accepted (Permanently Excluded)

---

## Decision: Simulation Engine Implementation Strategy

**Decision:** Implement a rule-based deterministic traffic calculator for synthetic workloads (users, req/s, cache hit %, replication) and use an LLM only to summarize the findings in plain language.

**Reason:** Mathematical equations accurately calculate database saturation and queue backlog without hallucination; the LLM translates the numbers into readable narrative explanations.

**Alternatives:** Asking an LLM to hallucinate throughput calculations.

**Status:** Pending / TBD (Phase 7 — Nice-to-Have, conditional on time)

---

## Decision: Zero-Cost Cloud Deployment (~$0 Free Stack)

**Decision:** Target free-tier cloud services for production: Vercel/Netlify for frontend, Render/Railway for backend, Supabase/Neon for PostgreSQL + `pgvector`, and Upstash for Redis.

**Reason:** Enables public demonstration and benchmarking on live URLs without incurring ongoing cloud hosting expenses.

**Alternatives:** AWS ECS/EKS, GCP GKE, DigitalOcean Droplets.

**Status:** Accepted (Scheduled for Phase 8)

---

## Decision: Standalone Deterministic Rule Engine Layer

**Decision:** Extract deterministic architecture rules from ad-hoc helpers into an extensible, modular `RulesModule` that evaluates graph anti-patterns before RAG or LLM execution (`Metrics Engine → Rule Engine → RAG → LLM Reasoning`).

**Reason:** Guarantees sub-millisecond execution ($<0.2\text{ms}$ measured) of foundational checks (unprotected direct DB ingress, database SPOFs, missing cache tiers, synchronous coupling, and deep fan-out), eliminating any risk of LLM hallucinations for structural constraints.

**Alternatives:** Hardcoding ad-hoc checks directly in `MetricsService` or relying exclusively on LLM prompt instructions.

**Status:** Accepted (Implemented in Phase 3.5)

---

## Decision: Dual-Mode Vector Storage & Embedding Pipeline

**Decision:** Support vector indexing with serialized embeddings in `KnowledgeDoc` model, pairing external embedding providers (Gemini `text-embedding-004`, OpenAI `text-embedding-3-small`) with a local normalized 64-dimensional semantic embedder and in-memory cosine similarity fallback.

**Reason:** Guarantees a zero-crash offline developer experience that works immediately on local SQLite/PostgreSQL without mandatory external API keys or Docker requirements, while retaining 100% compatibility with production `pgvector`.

**Alternatives:** Requiring live external embedding API keys or requiring local PostgreSQL `pgvector` extension to be active at all times.

**Status:** Accepted (Implemented in Phase 4)

