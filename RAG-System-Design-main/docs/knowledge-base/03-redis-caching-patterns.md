---
title: Redis Caching Patterns & Eviction Policies
topic: In-Memory Data Stores & Caching
keywords: [redis, cache-aside, write-through, write-behind, eviction, lru, lfu, ttl, cache stampede]
recommendedFor: [high read-to-write ratio, sub-millisecond latency, session stores, rate limiting]
---

# Redis Caching Patterns & Eviction Policies

## 1. Overview & Purpose
Redis is an open-source, in-memory key-value data structure store capable of serving hundreds of thousands of operations per second with sub-millisecond response times ($<1\text{ms}$). It acts as an essential buffer shielding disk-bound databases.

## 2. Core Caching Access Patterns
- **Cache-Aside (Lazy Loading)**:
  - App queries Redis first. If cache hit, return immediately.
  - If cache miss, read from primary database, write result back to Redis with a TTL, and return.
  - *Best for*: Read-heavy workloads with unpredictable access distributions.
- **Write-Through**:
  - Application writes data to the cache, which synchronously persists the write to the database before acknowledging.
  - *Best for*: Zero cache-miss read spikes immediately following writes.
- **Write-Behind (Write-Back)**:
  - App writes to Redis first; an asynchronous background worker batches updates into the relational DB.
  - *Best for*: Write-heavy loads (e.g. view counters, click analytics). Risk of data loss if Redis restarts before persistence.

## 3. Memory Eviction Policies
- **volatile-lru**: Evicts Least Recently Used keys among keys with an expiration (`EXPIRE`).
- **allkeys-lru**: Evicts LRU keys across all keys; standard for general-purpose cache instances.
- **allkeys-lfu**: Evicts Least Frequently Used keys; prevents infrequently accessed bursts from evicting hot keys.
- **noeviction**: Returns an out-of-memory error on writes when RAM fills up; appropriate when Redis is used as a primary datastore rather than a transient cache.

## 4. Key Architectural Trade-offs
- **Speed vs Durability**: In-memory speed means persistence (RDB snapshots or AOF append-only files) incurs I/O overhead or risks minor data loss in worst-case crashes.
- **Cache Consistency**: Cache invalidation is notoriously difficult; updates must delete keys rather than update them to avoid race conditions.

## 5. Failure Modes & Mitigations
- **Cache Penetration**: Queries for non-existent records repeatedly bypass the cache and hammer the database. *Fix*: Bloom filters or cache negative results (`null`) with short TTL.
- **Cache Stampede**: Expiring hot keys trigger simultaneous DB recalculations. *Fix*: Mutex locks / probabilistic early expiration (XFetch).
- **Cache Avalanche**: Hundreds of keys expiring at the exact same second. *Fix*: Add random jitter to key TTLs (`TTL + rand(0, 300)`).

## 6. Architecture Rules & Metrics
- **Target Hit Ratio**: $\ge 90\%$ for hot database query caches.
- **Memory Ceiling**: Keep Redis peak memory usage $\le 75\%$ to leave headroom for BGSAVE fork processes.
