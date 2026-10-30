# Phase 1: Foundations & Architecture Whiteboard (Simple Guide)

A simple, clear, and complete explanation of everything built in **Phase 1 (Foundations — Milestone v0.1)** of the **System Design Interview Tool**.

---

## 🌟 The Big Picture: What is Phase 1?

Phase 1 turns an empty folder into a **working cloud architecture platform**. It delivers the foundational milestone from the roadmap:

$$\text{Sign Up} \longrightarrow \text{Create Project} \longrightarrow \text{Draw Architecture on Infinite Canvas} \longrightarrow \text{Save Diagram to Database}$$

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASE 1 COMPLETE DATA FLOW                             │
│                                                                                        │
│   [ Client Browser (Port 5173) ]                                                       │
│   ├── Interactive Infinite Whiteboard (React Flow)                                     │
│   ├── 35+ Real Tech Components (PostgreSQL, Kafka, Redis, Docker)                      │
│   └── Top Navigation Bar (Sign Up, Create Project, Save Version)                       │
│                 │                                                                      │
│                 │ (1) HTTP Requests with Secure Passport (Bearer JWT Token)           │
│                 ▼                                                                      │
│   [ NestJS Backend API (Port 4000) ]                                                   │
│   ├── Guards & Ownership: Checks "Does this project belong to you?"                   │
│   ├── Security: Hashes passwords with salt (bcryptjs)                                  │
│   ├── Structured Logging: Prints [HTTP] GET /api/projects 200 4ms                     │
│   ├── Health Checks: /health reports uptime & status                                   │
│   └── Interactive API Explorer: /api/docs (Swagger OpenAPI)                            │
│                 │                                                                      │
│                 │ (2) Type-safe queries via Prisma ORM                                 │
│                 ▼                                                                      │
│   [ Database & Infrastructure ]                                                        │
│   ├── PostgreSQL 16 (Users, Refresh Tokens, Projects, Versioned Diagrams)              │
│   └── Docker Compose (PostgreSQL, Redis 7, Redpanda Kafka Broker)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component-by-Component Explanation (Simple 4-Step Breakdown)

Every component below answers 4 simple questions:
1. **What is it?**
2. **Why did we use this?**
3. **Why is it necessary?**
4. **What happens if we don't use it?**

---

### 1. Monorepo Setup & npm Workspaces ([`package.json`](file:///d:/Major%20Project/System-Design-with-AI/package.json))

* **What is it?**
  Instead of having two separate GitHub repositories (one for frontend and one for backend), we place both inside one single project folder called a **Monorepo** with two workspaces: `client` and `server`.
* **Why did we use this?**
  It lets you install all dependencies with **one single command** (`npm install`) and start both frontend and backend together with **one command** (`npm run dev`).
* **Why is it necessary?**
  When you change how a diagram node or API response works, both the frontend and backend stay immediately in sync. You never have to copy-paste code between two projects.
* **What happens if we don't use it?**
  You would have to open two separate VS Code windows, run two separate terminals, and manually synchronize data formats. A small change in the backend would silently crash the frontend.

---

### 2. React 19 + TypeScript + Vite (`client/`)

* **What is it?**
  The modern frontend toolkit used to build the website:
  * **React 19**: Builds the visual user interface using reusable components.
  * **TypeScript**: Adds strict type-checking to JavaScript (like a spell-checker for code).
  * **Vite**: The ultra-fast local development server.
* **Why did we use this?**
  * **Vite** updates the screen in $<300\text{ms}$ whenever you edit a file (Hot Module Replacement).
  * **TypeScript** catches spelling mistakes before you even run your code.
  * **React 19** renders complex whiteboard movements smoothly without freezing.
* **Why is it necessary?**
  Architecture diagrams contain complex nested data (node positions, arrow connections, protocols, database types). If you misspell a word (like `node.technlogy` instead of `node.technology`), TypeScript warns you immediately.
* **What happens if we don't use it?**
  Older build tools take 20+ seconds to reload on every save. Plain JavaScript won't catch bugs until your application unexpectedly freezes or crashes during a live demo or interview.

---

### 3. Visual Architecture Canvas ([`@xyflow/react` v12](file:///d:/Major%20Project/System-Design-with-AI/client/src/App.tsx))

* **What is it?**
  A battle-tested React library designed specifically for building interactive flowcharts, diagrams, and node-based graphs.
* **Why did we use this?**
  It gives us out-of-the-box support for:
  * Infinite zooming and smooth canvas panning.
  * Curved arrows that route cleanly between boxes.
  * Snapping connector ports (`Handles`) that connect components with a click.
  * Interactive mini-map so you never get lost on large diagrams.
* **Why is it necessary?**
  Building a custom drag-and-drop whiteboard from scratch requires thousands of lines of complex mathematics (matrix scaling, collision detection, bezier curves). React Flow does all of this behind the scenes so we can focus on system design and AI.
* **What happens if we don't use it?**
  You would spend 3 to 4 months trying to make basic boxes draggable and lines straight. It would be buggy and slow, wasting all your time on basic geometry instead of building the AI platform.

---

### 4. Tailwind CSS v4 & Deep OLED Theme ([`client/src/index.css`](file:///d:/Major%20Project/System-Design-with-AI/client/src/index.css))

* **What is it?**
  A utility-first CSS styling engine configured with an engineering dark theme.
* **Why did we use this?**
  Tailwind v4 compiles in milliseconds with zero configuration files and provides consistent styling classes (like `bg-slate-900`, `border-slate-800`, `rounded-xl`).
* **Why is it necessary?**
  Software engineers expect dark mode developer tools. Our studio uses deep midnight slate (`#0B0F19`), clean glassmorphic borders, and color-coded architectural components:
  * **Clients**: Emerald (`#10b981`)
  * **Gateways**: Cyan (`#06b6d4`)
  * **Services**: Violet (`#8b5cf6`)
  * **Databases**: Blue (`#3b82f6`)
  * **Caches**: Fuchsia (`#d946ef`)
  * **Queues**: Amber (`#f59e0b`)
* **What happens if we don't use it?**
  You have to write hundreds of messy CSS files. Colors clash across pages, and the tool looks like an amateur school project rather than a high-end developer studio.

---

### 5. 35+ Component Palette ([`ComponentPalette.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/palette/ComponentPalette.tsx))

* **What is it?**
  A searchable slide-out catalog of real-world distributed system technologies.
* **Why did we use this?**
  Instead of drawing generic empty boxes, engineers can drag real technologies onto the canvas:
  * PostgreSQL, MySQL, MongoDB, DynamoDB, Cassandra
  * Redis, Memcached
  * Apache Kafka, RabbitMQ, Redpanda, AWS SQS
  * NGINX, Kong, AWS API Gateway, Cloudflare CDN
  * Docker Containers, Node.js, Go Services, Python Services
* **Why is it necessary?**
  In real system design interviews, interviewers ask: *"Why did you choose Redis instead of Memcached?"* or *"Why Kafka instead of RabbitMQ?"* Having concrete technologies makes the design realistic and allows the AI to give grounded critique.
* **What happens if we don't use it?**
  The diagram is just generic abstract squares. The AI cannot give specific feedback on caching strategies, database replication, or message queues.

---

### 6. Smart Protocol Arrows ([`CustomProtocolEdge.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/edges/CustomProtocolEdge.tsx))

* **What is it?**
  Custom animated connecting lines that display the exact network communication protocol used between services (`HTTPS`, `gRPC`, `SQL`, `Pub/Sub`, `WebSocket`, `TCP`).
* **Why did we use this?**
  Connecting two boxes with a plain line does not explain how they communicate. A smart arrow shows whether the call is synchronous (`HTTPS`, `gRPC`) or asynchronous (`Pub/Sub`).
* **Why is it necessary?**
  System architecture is defined by how components talk to each other. An arrow labeled `SQL` tells the Metrics Engine that a service is talking directly to a database.
* **What happens if we don't use it?**
  Connections are ambiguous. You cannot tell if a service is making a synchronous blocking HTTP call or an asynchronous background event publish.

---

### 7. PostgreSQL 16 & Prisma ORM ([`schema.prisma`](file:///d:/Major%20Project/System-Design-with-AI/server/prisma/schema.prisma))

* **What is it?**
  A battle-tested relational database managed through **Prisma ORM** (Object-Relational Mapping).
* **Why did we use this?**
  Prisma translates between TypeScript backend code and PostgreSQL. Instead of writing raw SQL strings, you write type-safe TypeScript:
  ```typescript
  const project = await prisma.project.create({ data: { name, userId } });
  ```
* **Why is it necessary?**
  Prisma prevents SQL injection attacks, provides autocomplete suggestions in your editor, and guarantees that database relationships (User $\to$ Projects $\to$ Diagrams) are strictly enforced.
* **What happens if we don't use it?**
  You would write raw SQL queries by hand. A single typo in a column name will crash your server in production, and your application is vulnerable to SQL injection attacks.

---

### 8. The 4 Core Database Tables

* **What is it?**
  The four relational blueprints in our database:
  1. **`User`**: Stores email, encrypted password, name, and admin status.
  2. **`RefreshToken`**: Stores long-lived tokens so you stay logged in securely.
  3. **`Project`**: Workspaces created by users (e.g. "Scalable E-Commerce System").
  4. **`Diagram`**: The saved architecture revisions (`version: 1`, `version: 2`, `version: 3`).
* **Why did we use this?**
  Notice that every `Diagram` has a sequential `version` number.
* **Why is it necessary?**
  Every time you click **Save**, the backend creates a **new revision** instead of overwriting your previous design. This lets you inspect past versions, track architectural iterations, or rollback bad decisions.
* **What happens if we don't use it?**
  Saving overwrites your single diagram file. If you make a mistake or change your mind, your previous architecture is gone forever.

---

### 9. Secure Authentication & Password Hashing ([`auth.service.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/auth/auth.service.ts))

* **What is it?**
  The user registration and login system protected by **`bcryptjs`** salted password hashing.
* **Why did we use this?**
  Passwords are never stored in plain text. Bcrypt adds a unique cryptographic salt (10 rounds) and generates a one-way hash:
  $$\text{"Password123!"} \longrightarrow \text{"\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"}$$
* **Why is it necessary?**
  If someone steals the database, they cannot read any user passwords because one-way hashes cannot be decrypted.
* **What happens if we don't use it?**
  Plain-text passwords stored in a database violate fundamental security practices and expose all user accounts if a database leak occurs.

---

### 10. Dual-Token Architecture: Access Token + Refresh Token Rotation

* **What is it?**
  A two-token authentication system:
  * **Access Token (JWT)**: A short-lived digital passport ($1\text{ hour}$) sent with every HTTP request.
  * **Refresh Token**: A long-lived key ($7\text{ days}$) stored in the database used only to obtain a new Access Token.
* **Why did we use this?**
  If a malicious attacker intercepts your Access Token, it automatically expires in 60 minutes. Meanwhile, the user stays logged in because the Refresh Token silently refreshes it behind the scenes.
* **Why is it necessary?**
  If you only use a single permanent token, that token can never be revoked if stolen. With refresh token rotation, you can revoke access instantly by deleting the token from the database.
* **What happens if we don't use it?**
  Users either get logged out every 15 minutes (annoying), or you use an eternal token that can never be revoked if stolen (dangerous).

---

### 11. Resource Ownership Authorization ([`projects.service.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/projects/projects.service.ts))

* **What is it?**
  A strict security rule on every API endpoint:
  ```typescript
  if (project.userId !== currentUser.id && !currentUser.isAdmin) {
    throw new ForbiddenException('Access denied: You do not own this project');
  }
  ```
* **Why did we use this?**
  Instead of building a massive, slow enterprise RBAC (Role-Based Access Control) matrix with dozens of role tables, we use lightweight **resource ownership** plus an `isAdmin` flag.
* **Why is it necessary?**
  Prevents User A from viewing, editing, or deleting User B's architecture diagrams just by guessing their project ID in the URL.
* **What happens if we don't use it?**
  Any logged-in user could read, modify, or delete another user's private architecture designs (Insecure Direct Object Reference vulnerability).

---

### 12. Interactive OpenAPI / Swagger Documentation ([`server/src/main.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/main.ts))

* **What is it?**
  A built-in interactive web documentation page hosted directly at [**`http://localhost:4000/api/docs`**](http://localhost:4000/api/docs).
* **Why did we use this?**
  It automatically scans our NestJS controllers and DTOs to generate a live, interactive API testing dashboard.
* **Why is it necessary?**
  Developers can test endpoints (`/api/auth/login`, `/api/projects`, `/api/diagrams/:id`) directly in their web browser without opening Postman or writing curl commands.
* **What happens if we don't use it?**
  You have to manually maintain an outdated PDF or text file explaining your API. New developers have to guess what parameters each endpoint expects.

---

### 13. Health Check Endpoint ([`app.controller.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/app.controller.ts))

* **What is it?**
  A lightweight endpoint at `GET /health` that responds instantly:
  ```json
  {
    "status": "ok",
    "service": "system-design-backend",
    "timestamp": "2026-09-17T18:38:29.924Z",
    "uptime": 1984.1
  }
  ```
* **Why did we use this?**
  Provides a fast, zero-database ping check.
* **Why is it necessary?**
  Cloud platforms (like Render, Railway, Kubernetes, or AWS) continuously ping `/health` every 10 seconds. If the app stops responding, the cloud orchestrator restarts it automatically.
* **What happens if we don't use it?**
  If the backend hangs or freezes in production, the cloud provider has no way of knowing it crashed, and users will see infinite loading screens.

---

### 14. Structured HTTP Request Logging ([`server/src/main.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/main.ts))

* **What is it?**
  A lightweight NestJS logging middleware that prints every incoming HTTP request and its processing duration:
  `[HTTP] POST /api/diagrams/906f97e5/save 201 - 12ms`
* **Why did we use this?**
  It provides immediate visual visibility into every request hitting your backend.
* **Why is it necessary?**
  When you click "Save" on the whiteboard and nothing happens, the HTTP log immediately tells you what happened: did the request arrive? Did it return a 401 Unauthorized? Did it succeed in 12ms?
* **What happens if we don't use it?**
  The backend terminal is completely silent. When an error occurs, you have no idea if the frontend even sent the request.

---

### 15. Automated Test Suite & GitHub Actions CI

* **What is it?**
  * **Jest Test Suite**: Automated unit tests in `server/src/` testing password hashing, domain normalization, and graph traversal.
  * **GitHub Actions CI ([`.github/workflows/ci.yml`](file:///d:/Major%20Project/System-Design-with-AI/.github/workflows/ci.yml))**: Automatically runs linting, building, and unit tests on every Git push.
* **Why did we use this?**
  Ensures that code cannot be merged or deployed if tests fail.
* **Why is it necessary?**
  Fulfills **Rule 9** of our engineering discipline: *"Every phase must be verified and tested before moving to the next phase."*
* **What happens if we don't use it?**
  A developer makes a small change to the diagram data structure that secretly breaks the auth system, and nobody discovers it until production crashes.

---

## 📊 Phase 1 Quick Reference Summary

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend Whiteboard** | React 19 + `@xyflow/react` v12 | Drag-and-drop infinite canvas with 35+ tech components |
| **Styling & Theme** | Tailwind CSS v4 | Deep OLED dark theme with category color-coding |
| **Backend Framework** | NestJS 11 + TypeScript | Modular API monolith with global validation |
| **Database & ORM** | PostgreSQL 16 + Prisma | Relational persistence with sequential diagram versioning |
| **Authentication** | `bcryptjs` + JWT | Salted password hashing, 1-hour access + 7-day refresh tokens |
| **Authorization** | Resource Ownership Guard | Verifies `project.userId === user.id` + `isAdmin` flag |
| **Infrastructure** | Docker Compose | Containers for PostgreSQL, Redis 7, and Redpanda |
| **Quality & CI** | Jest + GitHub Actions | Automated unit testing on every push |
| **Observability** | Swagger + Logging + Health | `/api/docs`, `/health`, and structured request logs |

---

## 🎯 Phase 1 Milestone Verification

The Phase 1 milestone is 100% verified and operational:
1. **Sign Up**: `POST /api/auth/register` creates user and returns JWT tokens.
2. **Create Project**: `POST /api/projects` creates a dedicated architecture workspace.
3. **Draw Architecture**: Drag components (API Gateway, NestJS Service, PostgreSQL) and connect them with protocol arrows (`HTTPS`, `SQL`).
4. **Save Diagram**: `POST /api/diagrams/:projectId/save` stores the new diagram version in the database.
