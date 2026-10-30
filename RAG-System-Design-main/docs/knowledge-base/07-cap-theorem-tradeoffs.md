---
title: CAP Theorem & PACELC Trade-Offs
topic: Distributed Systems Theory & Guarantees
keywords: [cap theorem, pacelc, consistency, availability, partition tolerance, latency, linearizability]
recommendedFor: [distributed datastore selection, network partition resilience, system design interviews]
---

# CAP Theorem & PACELC Trade-Offs

## 1. The CAP Theorem Foundation
The CAP Theorem (Brewer's Theorem) proves that in an asynchronous network subject to partitions ($P$), a distributed data store can guarantee at most two of three properties:
1. **Consistency (Linearizability)**: Every read receives the most recent write or an error.
2. **Availability**: Every non-failing node returns a non-error response, without guaranteeing it contains the latest write.
3. **Partition Tolerance**: The system continues to operate despite arbitrary packet drops or network delay between nodes.

Because physical networks are inherently unreliable, **Partition Tolerance ($P$) is non-negotiable** in distributed systems. Therefore, system design is fundamentally a choice between **CP** and **AP** during network partitions.

## 2. CP vs AP Systems
- **CP (Consistency + Partition Tolerance)**:
  - If a network partition occurs, minority nodes refuse to accept writes or return errors to prevent divergent states.
  - *Examples*: Google Spanner, Apache HBase, CockroachDB, Etcd, Redis Sentinel.
  - *Use cases*: Financial ledger transactions, inventory management, distributed locks.
- **AP (Availability + Partition Tolerance)**:
  - Both sides of a partition accept writes and serve reads, accepting that data will diverge until the network heals (eventual consistency).
  - *Examples*: Apache Cassandra, AWS DynamoDB, CouchDB.
  - *Use cases*: Social media feeds, analytics telemetry, shopping cart draft states.

## 3. Beyond CAP: The PACELC Theorem
CAP only describes system behavior *during a network partition*. The PACELC theorem extends this:
- **If there is a Partition ($P$)**: Choose between **Availability ($A$)** and **Consistency ($C$)**.
- **Else ($E$) (normal operation)**: Choose between **Latency ($L$)** and **Consistency ($C$)**.

| System | Classification | Normal Behavior | Partition Behavior |
| :--- | :--- | :--- | :--- |
| **Cassandra / DynamoDB** | **PA/EL** | Optimizes for lowest Latency ($L$) | Prioritizes Availability ($A$) |
| **Spanner / CockroachDB** | **PC/EC** | Guarantees Strict Consistency ($C$) | Preserves Consistency ($C$) |
| **MongoDB / PostgreSQL** | **PC/EC** | Strong Consistency on Primary ($C$) | Halts writes on isolated Primary ($C$) |

## 4. Key Architectural Trade-offs
- **Linearizability vs P99 Latency**: Enforcing cross-region consensus (e.g. Paxos/Raft rounds) guarantees linearizability but inflates write P99 latency by $100\text{ms} - 300\text{ms}$.
- **Conflict Resolution Overhead**: AP systems require application-level reconciliation logic (CRDTs or timestamps) to merge conflicting concurrent mutations.

## 5. Architecture Rules & Metrics
- **Never Claim "CA in a Distributed System"**: Any system spanning multiple network hosts must handle partitions.
- **Explicit SLA Definition**: Quantify availability target ($99.99\%$ vs $99.999\%$) and data staleness tolerance window before selecting database engines.
