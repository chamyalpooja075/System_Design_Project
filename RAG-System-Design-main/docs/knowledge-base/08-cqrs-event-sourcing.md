---
title: CQRS & Event Sourcing Architecture
topic: Data Architecture & State Management
keywords: [cqrs, event sourcing, read model, write model, materialized views, event store, eventual consistency]
recommendedFor: [complex domain models, audit compliance, asymmetric read/write scale, collaborative editing]
---

# CQRS & Event Sourcing Architecture

## 1. CQRS (Command Query Responsibility Segregation)
CQRS separates the data modification model (**Commands**) from the data reading model (**Queries**):
- **Command Side**: Optimized strictly for business invariant validation, consistency rules, and fast writes.
- **Query Side**: Denormalized, read-optimized data views (materialized views, Elasticsearch, Redis) tailored for specific UI screens without expensive joins.

## 2. Event Sourcing
Instead of storing only the current transient state of an entity (e.g. `balance = $120`), Event Sourcing stores the complete, immutable sequence of business events that led to that state:
- `AccountOpened(id=1, owner="Alice")`
- `MoneyDeposited(id=1, amount=$150)`
- `MoneyWithdrawn(id=1, amount=$30)`
Current state is computed deterministically by replaying events from genesis (or loading the latest periodic snapshot).

## 3. Combining CQRS with Event Sourcing
1. Client sends Command $\to$ Command Handler validates business logic.
2. Command produces domain events $\to$ Appended to append-only Event Store.
3. Event Store publishes events onto an asynchronous event bus (Kafka / Redpanda).
4. Projections consume events and update denormalized Read Models (PostgreSQL / Redis / Elasticsearch).
5. Client queries read models with sub-millisecond response times.

## 4. Key Architectural Trade-offs
- **High Read/Write Performance vs System Complexity**: Unlocks massive asymmetric scaling, but dramatically increases operational complexity, schema evolution rules, and projection lag.
- **Auditability vs Event Store Growth**: Complete audit history is preserved forever, but the event store grows monotonically, requiring snapshotting strategies.

## 5. Failure Modes & Mitigations
- **Projection Desynchronization**: A projection worker crashes or encounters an unhandled exception, causing read models to drift from reality. *Fix*: Idempotent consumer workers and replay reconciliation pipelines.
- **Event Schema Drift**: Modifying event payloads years later breaks historical event replays. *Fix*: Upcasters and schema registry versioning.

## 6. Architecture Rules & Metrics
- **Snapshot Frequency**: Create a materialized state snapshot every $100 - 500$ events to bound replay recovery latency under $50\text{ms}$.
- **Event Immutability**: Domain events must never be updated or deleted from the event store.
