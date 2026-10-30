---
title: Database Sharding & Horizontal Partitioning
topic: Database Scalability & Partitioning
keywords: [sharding, horizontal partitioning, partition key, consistent hashing, rebalancing, cross-shard joins]
recommendedFor: [terabyte-scale storage, write-heavy relational databases, tenant isolation]
---

# Database Sharding & Horizontal Partitioning

## 1. Overview & Purpose
Database sharding horizontally splits a single logical dataset across multiple independent physical database instances (shards). It overcomes single-node RAM, disk I/O, and write throughput limits.

## 2. Sharding Strategies
- **Range-Based Sharding**: Partitions rows by value ranges (e.g. users with IDs $1-1,000,000$ on Shard 1). Simple to map, but vulnerable to hot spots if new records cluster into the highest range.
- **Hash-Based Sharding**: Passes a shard key through a hash function: $\text{shard} = \text{hash}(\text{key}) \pmod N$. Distributes traffic evenly, but resizing shard count $N$ requires massive data reshuffling.
- **Consistent Hashing**: Distributes nodes and keys across a hash ring ($2^{32} - 1$). Adding a new shard requires migrating only $1/N$ of keys rather than re-hashing the entire dataset.
- **Directory-Based (Lookup) Sharding**: Maintains a central mapping service that resolves which shard holds which entity. Highly flexible, but lookup service itself becomes a high-availability critical path.

## 3. Key Architectural Trade-offs
- **Write Scalability vs Query Complexity**: Individual shard writes run at hardware speed, but queries spanning multiple shards require distributed scatter-gather logic, multiplying network latency.
- **Transactions & Cross-Shard Joins**: ACID guarantees across shards require two-phase commit (2PC), which degrades performance. System design best practice is to design shard keys so $95\%+$ of transactions are single-shard.

## 4. Failure Modes & Anti-Patterns
- **Hotspot Shards (Celebrity Problem)**: High-activity entities (e.g., viral accounts) overload their designated shard while other shards sit idle.
- **Unbalanced Shard Growth**: Unequal storage consumption across shards requiring complex manual online rebalancing.

## 5. Architecture Rules & Metrics
- **When to Shard**: Do NOT shard prematurely. Exhaust read replicas, indexing, and connection pooling first. Shard only when database size exceeds $1-2\text{TB}$ or write RPS exceeds single-node SSD IOPS limits.
- **Shard Key Immutability**: Shard keys should almost never be updated; updating a shard key requires deleting and re-inserting across physical nodes.
