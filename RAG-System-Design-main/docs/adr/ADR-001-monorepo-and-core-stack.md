# ADR-001: Monorepo Architecture & Core Stack Selection

## Context
The System Design Interview Tool requires tightly coupled collaboration between a rich visual canvas (React Flow), deterministic calculation engines (Metrics & Rules), and an asynchronous streaming AI/RAG backend. A single developer needs high velocity, shared domain models, unified CI/CD, and low operational overhead.

## Decision
We adopted an npm-workspace monorepo containing:
1. **Frontend (`client/`)**: React 19 + TypeScript + Vite + Tailwind CSS + `@xyflow/react`.
2. **Backend (`server/`)**: NestJS + TypeScript + Prisma ORM + `@nestjs/swagger` + `@nestjs/jwt`.
3. **Local Infrastructure (`docker/`)**: Docker Compose for PostgreSQL 16 (`pgvector`), Redis 7, and Redpanda (Kafka-compatible).

## Alternatives Considered
- **Polyrepo (Separate GitHub repositories)**:
  - Rejected due to overhead in synchronizing domain model contracts, multi-repo PRs, and complex cross-repo versioning for a solo project.
- **Microservices for Backend**:
  - Rejected in favor of a NestJS modular monolith. Modular boundaries (`auth`, `diagrams`, `metrics`, `ai`) maintain clean isolation without the latency, deployment complexity, or network failure modes of microservices.
- **Next.js Full-Stack Monolith**:
  - Rejected because long-running WebSocket connections, Kafka consumer workers, and complex graph traversal algorithms are better isolated in a dedicated Node.js/NestJS process rather than serverless lambdas.

## Consequences
- **Positive**:
  - Single `npm install` and synchronized scripts (`npm run dev`, `npm run build`).
  - Strict TypeScript interfaces can be shared between frontend and backend.
  - Zero-overhead local testing and Docker Compose deployment.
- **Trade-offs / Added Complexity**:
  - Must ensure frontend dependencies (e.g. React 19) do not collide with Node.js backend tools. Handled cleanly using npm workspaces.
