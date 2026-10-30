---
title: Consistency Models in Distributed Systems
topic: Distributed Systems Guarantees & Concurrency
keywords: [consistency models, linearizability, sequential consistency, causal consistency, eventual consistency, read-your-writes, monotonic reads]
recommendedFor: [database design, multi-region replication, distributed state synchronization]
---

# Consistency Models in Distributed Systems

## 1. Overview & Purpose
In distributed architectures where state is replicated across multiple independent nodes or data centers, the **consistency model** defines the contract between the system and its clients regarding the visibility and ordering of concurrent read and write operations.

## 2. Spectrum of Consistency Models

### Strong Consistency Spectrum
1. **Strict Consistency / Linearizability (Strongest)**:
   - All operations appear to take effect atomically at a specific point in time between their invocation and response.
   - If client A writes value $V_1$ at timestamp $T_1$, every client reading at $T > T_1$ is mathematically guaranteed to read $V_1$.
   - *Requires*: Global synchronized time (e.g. TrueTime / GPS hardware clocks) or synchronous consensus rounds (Paxos/Raft).
2. **Sequential Consistency**:
   - Operations from all processes appear in a single globally agreed-upon order that respects each process's local program order. Exact real-time physical ordering is relaxed.

### Weak & Client-Centric Consistency Spectrum
3. **Causal Consistency**:
   - Operations that are causally related (cause and effect) must be seen by every node in the same order. Concurrent operations that are independent may be seen in different orders.
4. **Read-Your-Writes (Session Consistency)**:
   - A single client is guaranteed to always see the effects of its own preceding writes, even if other concurrent clients read older versions.
5. **Monotonic Reads**:
   - Once a client reads value $V$, it will never observe an older value in subsequent read operations.
6. **Eventual Consistency (Weakest)**:
   - If no new updates are made, all replicas will eventually converge to the same value. No guarantee is made regarding *when* convergence completes.

## 3. Key Architectural Trade-offs
- **Consistency vs Write Latency**: Strong linearizability requires cross-replica synchronous lock acquisition, yielding high P99 write latencies ($>100\text{ms}$ in multi-region setups). Eventual consistency yields single-digit millisecond latency ($<5\text{ms}$).
- **Concurrency Complexity**: Eventual consistency pushes concurrency conflict resolution onto application engineers (e.g. implementing CRDTs or last-write-wins timestamps).

## 4. Practical Implementation Strategies
- **Sticky Routing for Session Consistency**: Route all read/write traffic from a specific logged-in user to the same database replica or region.
- **Quorum Reads/Writes ($R + W > N$)**:
  - In a system with $N$ replicas, if read quorum $R$ and write quorum $W$ satisfy $R + W > N$, every read quorum intersects with at least one updated node from the write quorum.

## 5. Architecture Rules & Metrics
- **Financial Balances**: Require strict linearizability or sequential consistency with two-phase locking.
- **Social Media Feeds & Likes**: Eventual consistency is completely acceptable.
