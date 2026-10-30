# Phase 2: Core Product, Metrics Engine & AI Critique (Simple Guide)

A simple, clear, and complete explanation of everything built in **Phase 2 (Core Product — Milestone v0.2–v0.4)** of the **System Design Interview Tool**.

---

## 🌟 The Big Picture: What is Phase 2?

In Phase 1, we built the visual whiteboard, database, and user accounts. But the computer didn't actually **understand** what you drew—to the app, it was just boxes and lines on a canvas.

**Phase 2 gives our application an architectural brain and productivity superpowers:**
1. **Understands Architecture, Not Pixels**: Translates screen pixels ($x, y$) into a pure, clean graph of services, databases, caches, queues, and gateways.
2. **Deterministic Metrics Engine**: Instantly calculates system health using battle-tested computer science graph algorithms:
   - Detects **Single Points of Failure (SPOFs)** (e.g. an unreplicated primary database).
   - Detects **Deadlock Cycles** using Depth-First Search (Service A $\to$ Service B $\to$ Service A).
   - Measures **Service Fan-Out** (how many dependencies each service touches).
   - Counts **Ingress Gateways / Load Balancers**.
   - Computes an overall **Redundancy Score** (0 to 100).
3. **Provider-Agnostic AI Critique**: Sends your system to Google Gemini, Groq, or OpenAI to get an expert architectural critique.
4. **Guaranteed Graceful Degradation**: If an AI API key is missing or the network times out, the app **never crashes**—it instantly delivers a rule-based critique using local graph math.
5. **Autosave & Event-Based Version History**: Automatically saves your diagram in the background and lets you rollback to any historical revision (`v1, v2, v3...`).
6. **Undo & Redo History**: Full `Ctrl+Z` and `Ctrl+Y` support on the canvas.
7. **Interactive Node Inspector**: Click any component to change its name, technology, increase replica counts to eliminate SPOFs, duplicate, or delete it.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASE 2 COMPLETE ANALYSIS PIPELINE                     │
│                                                                                        │
│   [ Visual React Flow Canvas ]                                                         │
│   ├── Interactive Node Inspector (Edit replicas x1, x2, duplicate, delete)             │
│   ├── Undo / Redo History Stack (Ctrl+Z / Ctrl+Y)                                      │
│   └── Background Autosave (3.5s debounce sync)                                         │
│                 │                                                                      │
│                 │ (1) Raw UI nodes (with screen x/y pixels, visual styles)             │
│                 ▼                                                                      │
│   [ Domain Normalizer ]                                                                │
│        └── Strips away pixels/colors ───► Pure Domain Graph (nodes, links, categories) │
│                 │                                                                      │
│                 │ (2) Normalized Graph Topology                                        │
│                 ▼                                                                      │
│   [ Graph Traversal Engine (Math & DFS Algorithms) ]                                  │
│        ├── Depth-First Search (DFS) ───► Finds circular dependency deadlocks           │
│        ├── SPOF Calculator ────────────► Flags unreplicated database bottlenecks       │
│        ├── Fan-Out Metric ─────────────► Measures outbound dependency load            │
│        └── Redundancy Score ───────────► Scores system resilience (0 to 100)          │
│                 │                                                                      │
│                 │ (3) Deterministic Metrics + Graph Topology                           │
│                 ▼                                                                      │
│   [ Provider-Agnostic AI Service ]                                                     │
│        ├── Has Gemini / Groq / OpenAI Key? ──► Calls LLM for deep expert critique     │
│        └── No Key / Network Failed? ─────────► Returns instant Rule-Based Critique    │
│                 │                               (Graceful Fallback: Never Crashes!)    │
│                 │ (4) Structured Analysis Response                                     │
│                 ▼                                                                      │
│   [ Executive Critique Modal ]                                                         │
│        ├── Overall Health Score (e.g. 90/100)                                          │
│        ├── Architecture Strengths                                                      │
│        ├── Single Point of Failure (SPOF) Alerts                                       │
│        ├── Scalability Bottlenecks                                                     │
│        └── Prioritized Action Items                                                    │
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

### 1. Normalized Domain Model ([`domain-model.interface.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/domain/domain-model.interface.ts))

* **What is it?**
  A clean TypeScript blueprint (`DomainNode`, `DomainEdge`, `DomainGraph`) that represents a system architecture in pure software engineering terms, completely separated from visual layout info.
* **Why did we use this?**
  A visual canvas cares about pixel positions: *"Node A is at horizontal position 420px, vertical position 180px, with blue border."* But a graph algorithm or AI only cares about: *"Service A has 3 replicas, connects to Service B via gRPC, and reads from PostgreSQL."*
* **Why is it necessary?**
  Strips out thousands of useless pixel numbers before sending data to AI prompts or graph math.
* **What happens if we don't use it?**
  Your backend becomes tightly coupled to the UI canvas library. AI prompts waste 4x more tokens reading pixel numbers, costing more money and increasing hallucinations.

---

### 2. Domain Normalizer Utility ([`domain-normalizer.util.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/domain/domain-normalizer.util.ts))

* **What is it?**
  A converter function that transforms raw React Flow JSON into the clean `DomainGraph`.
* **Why did we use this?**
  It sanitizes node properties, fills default replica counts, builds in-degree and out-degree maps, and constructs a graph adjacency list.
* **Why is it necessary?**
  Provides clean, reliable data for DFS algorithms and AI prompts without "cannot read properties of undefined" crashes.
* **What happens if we don't use it?**
  Any missing property on a newly dragged node causes backend algorithms to crash with an unhandled exception.

---

### 3. Deterministic Metrics Engine ([`graph-traversal.util.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/metrics/graph-traversal.util.ts))

* **What is it?**
  A pure mathematical graph algorithm engine that evaluates the architecture instantly ($<2\text{ms}$):
  * **SPOF Detection**: Flags any database, gateway, or service with $\text{replicas} \le 1$.
  * **DFS Cycle Detection**: Uses Depth-First Search with recursion stack tracking to detect circular dependency deadlocks.
  * **Fan-Out Metric**: Calculates the average number of outbound calls made by services.
  * **Redundancy Score**: Composite score out of 100 measuring system resilience.
* **Why did we use this?**
  Math and graph algorithms are **100% reliable**. They never hallucinate, cost zero dollars, and run in less than 2 milliseconds.
* **Why is it necessary?**
  LLMs frequently make mistakes counting nodes or finding cyclic paths. By computing the metrics mathematically first, we ground the AI in verifiable facts.
* **What happens if we don't use it?**
  The AI will hallucinate: it might claim you have 5 databases when you only drew 2, or overlook a circular dependency loop.

---

### 4. Provider-Agnostic AI Service ([`ai.service.ts`](file:///d:/Major%20Project/System-Design-with-AI/server/src/ai/ai.service.ts))

* **What is it?**
  A swappable AI client that routes all requests through a single `callLLM(prompt)` function.
* **Why did we use this?**
  Supports multiple providers via simple environment variables:
  * **Google Gemini 1.5 Flash** (Free default)
  * **Groq** (`llama-3.1-8b-instant`, ultra-fast streaming)
  * **OpenAI** (`gpt-4o-mini`)
  * **Local Ollama** (`Llama 3.1 8B`)
* **Why is it necessary?**
  You can swap your AI model at any time with a single `.env` setting (`LLM_PROVIDER=gemini` or `groq`) without rewriting any application code.
* **What happens if we don't use it?**
  You hardcode vendor-specific SDKs throughout your codebase. If a vendor changes their API or pricing, you have to rewrite your entire backend.

---

### 5. Zero-Crash Graceful Degradation Fallback

* **What is it?**
  A safety net that catches external LLM errors, rate-limit failures, or timeouts ($>9\text{s}$):
  ```typescript
  try {
    return await callLLM(prompt);
  } catch (err) {
    return buildDeterministicFallback(metrics);
  }
  ```
* **Why did we use this?**
  Guarantees that the app **always produces a helpful critique**, even if you have zero API keys, no internet connection, or an external AI service is down.
* **Why is it necessary?**
  The user sees: `"AI analysis unavailable. Showing deterministic analysis."` accompanied by full SPOF alerts, redundancy scores, and rule-based recommendations.
* **What happens if we don't use it?**
  An expired API key or brief internet disconnection crashes the server with an HTTP 500 error, leaving the user with a blank, broken screen.

---

### 6. Interactive Node Inspector Drawer ([`NodeConfigDrawer.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/inspector/NodeConfigDrawer.tsx))

* **What is it?**
  A slide-over configuration drawer that opens whenever you click any component on the canvas.
* **Why did we use this?**
  Lets engineers configure:
  * Component Name & Label
  * Technology (e.g. PostgreSQL, Redis, Kafka, Go, Node.js)
  * Category (client, gateway, service, database, cache, queue)
  * **Replicas count** ($x1, x2, x3+$)
  * Quick Actions: **Duplicate Node** and **Delete Node**
* **Why is it necessary?**
  Allows users to fix architectural vulnerabilities in real time. For example, clicking an unreplicated database and increasing replicas from 1 to 2 immediately removes the SPOF alert.
* **What happens if we don't use it?**
  Components are static, read-only boxes. You cannot configure replica counts, change technologies, or fix architectural bottlenecks.

---

### 7. Background Autosave with Debounce ([`client/src/App.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/App.tsx))

* **What is it?**
  An automatic background synchronization engine that saves diagram changes 3.5 seconds after the user stops editing.
* **Why did we use this?**
  Engineers forget to click "Save". Autosave silently writes changes to the database and displays a status indicator in the top navbar:
  * `Synced to Cloud (v2)`
  * `Autosaving to Database...`
  * `Unsaved changes`
* **Why is it necessary?**
  Prevents data loss if the browser tab is accidentally closed or refreshed.
* **What happens if we don't use it?**
  If a user draws a complex architecture for 30 minutes and accidentally reloads the page, all their work is lost.

---

### 8. Event-Based Version History & Rollback Modal ([`VersionHistoryModal.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/history/VersionHistoryModal.tsx))

* **What is it?**
  A version control dialog accessible from the top navbar (`History (v2)`).
* **Why did we use this?**
  Every save event creates a sequential revision (`v1`, `v2`, `v3...`). The modal displays every historical snapshot with its timestamp and lets you click **Restore** to rollback to any past design.
* **Why is it necessary?**
  Allows engineers to experiment with new ideas without fear. If an AI suggestion or refactor ruins your diagram, you can rollback to your previous revision with a single click.
* **What happens if we don't use it?**
  You can only see your latest state. There is no way to undo bad architectural changes or review how your design evolved over time.

---

### 9. Undo & Redo History Stack (`client/src/App.tsx`)

* **What is it?**
  A local snapshot stack tracking canvas modifications with full keyboard support (`Ctrl+Z` / `Cmd+Z` for Undo, `Ctrl+Y` / `Cmd+Shift+Z` for Redo) and toolbar buttons.
* **Why did we use this?**
  Provides standard desktop-quality editor ergonomics.
* **Why is it necessary?**
  If you accidentally delete a service or move an arrow to the wrong port, hitting `Ctrl+Z` immediately restores the previous canvas state.
* **What happens if we don't use it?**
  Accidentally deleting a component forces you to re-add, re-name, and re-wire all connections manually.

---

### 10. Executive AI Critique Modal ([`CritiqueModal.tsx`](file:///d:/Major%20Project/System-Design-with-AI/client/src/components/critique/CritiqueModal.tsx))

* **What is it?**
  A high-end visual report modal that displays the evaluation results:
  * **Overall Architecture Score** (e.g. `90 / 100`)
  * **Architectural Strengths** (what was designed correctly)
  * **Single Point of Failure (SPOF) Alerts**
  * **Scalability Bottlenecks** (caching, queue decoupling)
  * **Prioritized Action Items** (step-by-step improvements)
* **Why did we use this?**
  Presents the AI analysis in an executive, structured summary rather than an overwhelming wall of raw markdown.
* **Why is it necessary?**
  Mimics the feedback you receive from a Principal Architect in a real technical interview.
* **What happens if we don't use it?**
  Users receive raw unformatted text that is difficult to scan, prioritize, or act upon.

---

## 📊 Phase 2 Quick Reference Summary

| Layer | Feature | Key Responsibility |
| :--- | :--- | :--- |
| **Domain Layer** | Domain Normalizer | Decouples UI pixel coordinates from graph topology |
| **Analysis Engine** | Graph Traversal (`graph-traversal.util.ts`) | DFS cycle detection, SPOF detection, fan-out, redundancy score |
| **AI Layer** | Provider-Agnostic `AiService` | Swappable LLM caller (Gemini / Groq / OpenAI) with prompt builder |
| **Reliability** | Graceful Degradation | Guaranteed rule-based fallback if LLM is unavailable |
| **Persistence** | Autosave + Version History | Debounced background save + rollback to any historical revision |
| **Productivity** | Undo / Redo (`Ctrl+Z` / `Ctrl+Y`) | History snapshot stack for instant mistake recovery |
| **Canvas UX** | Node Inspector Drawer | Real-time replica editing, technology selection, duplicate, delete |
| **UI Reporting** | Executive Critique Modal | Structured presentation of scores, strengths, and recommendations |

---

## 🎯 Phase 2 Milestone Verification

The Phase 2 milestone is 100% verified and operational:
1. **Draw Architecture**: Drag components, configure replicas (e.g. PostgreSQL `replicas = 1`), and connect with protocol arrows.
2. **Deterministic Baseline**: `POST /api/metrics/evaluate` calculates services, databases, gateways, SPOFs, and redundancy score in $<2\text{ms}$.
3. **AI Critique with Real Stats**: Click "Run AI Critique" $\to$ `POST /api/ai/critique` returns structured analysis grounded in deterministic stats.
4. **Instant SPOF Elimination**: Open Node Inspector, increase DB replicas to 2 $\to$ re-run critique $\to$ SPOF alert disappears.
5. **Autosave & Version Rollback**: Changes auto-sync to the database; past revisions can be viewed and restored via the History modal.
