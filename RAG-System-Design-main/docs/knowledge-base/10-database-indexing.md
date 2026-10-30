---
title: Database Indexing Strategies & Query Optimization
topic: Database Performance & Data Structures
keywords: [b-tree, lsm-tree, hash index, composite index, covering index, write amplification, explain analyze]
recommendedFor: [query latency reduction, large table scans, high-concurrency read endpoints]
---

# Database Indexing Strategies & Query Optimization

## 1. Overview & Purpose
A database index is an auxiliary data structure that enables fast lookups without scanning every row in a table (sequential table scan - $O(N)$). Properly chosen indexes reduce disk I/O from seconds down to sub-millisecond seek times ($O(\log N)$).

## 2. Fundamental Index Structures
- **B-Tree / B+ Tree (Standard Relational)**:
  - Self-balancing multi-way search tree where all leaf nodes reside at equal depth and form a linked list.
  - *Optimal for*: Equality lookups ($=$) and range scans ($<, >, \text{BETWEEN}$).
  - Used by PostgreSQL, MySQL (InnoDB), and SQLite.
- **LSM-Tree (Log-Structured Merge-Tree)**:
  - Appends writes sequentially to an in-memory MemTable, then flushes immutable SSTables to disk with background compaction.
  - *Optimal for*: Ultra-high write throughput with acceptable read amplification.
  - Used by Cassandra, RocksDB, and ScyllaDB.
- **Hash Index**:
  - Direct $O(1)$ point lookups. Does NOT support range queries or sorting.
- **GIN / GIST (Generalized Inverted Indexes)**:
  - Indexes array elements, JSONB documents, and full-text vectors.

## 3. Advanced Indexing Techniques
- **Composite (Multi-Column) Index**:
  - Covers multiple columns: `CREATE INDEX idx ON orders (user_id, created_at DESC)`.
  - *Leftmost Prefix Rule*: Queries must filter by `user_id` to utilize the composite index.
- **Covering Index (Index-Only Scan)**:
  - Includes all requested `SELECT` columns inside the index tree leaves, eliminating secondary table heap lookups entirely.
- **Partial (Filtered) Index**:
  - Indexes only a subset of rows: `WHERE status = 'PENDING'`. Slashes index size by $90\%$ on skewed status distributions.

## 4. Key Architectural Trade-offs
- **Read Latency vs Write Amplification**: Every additional index speeds up read queries but forces the database engine to perform additional synchronous disk writes on every `INSERT`, `UPDATE`, and `DELETE`.
- **Memory Footprint**: Working indexes must fit in the operating system's RAM buffer pool; cold index pages cause high random disk I/O thrashing.

## 5. Architecture Rules & Metrics
- **Never Index Low-Cardinality Columns Alone**: Indexing a boolean flag (`is_active`) on a 10M row table is wasteful; use a partial index instead.
- **Buffer Pool Sizing**: Maintain RAM buffer pool size sufficient to hold $100\%$ of active primary and foreign key indexes.
