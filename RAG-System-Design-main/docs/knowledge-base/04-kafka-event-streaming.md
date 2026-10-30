---
title: Apache Kafka & Event-Driven Streaming
topic: Asynchronous Messaging & Streaming
keywords: [kafka, event streaming, partitions, consumer groups, offsets, backpressure, idempotency, redpanda]
recommendedFor: [event-driven microservices, high-throughput log ingestion, stream processing, asynchronous decoupling]
---

# Apache Kafka & Event-Driven Streaming

## 1. Overview & Purpose
Apache Kafka (and compatible brokers like Redpanda) provides a distributed, append-only commit log designed for high-throughput, fault-tolerant, and horizontally scalable asynchronous event streaming.

## 2. Core Architecture Building Blocks
- **Topics & Partitions**: A topic is divided into partitions across broker nodes. Partitions represent the fundamental unit of parallelism and ordering.
- **Message Ordering**: Strict total ordering is guaranteed within a single partition, keyed by message hash (e.g., `userId` or `orderId`).
- **Consumer Groups**: Multiple consumers share reading load across topic partitions. Each partition is assigned to exactly one consumer in the group.
- **Offset Management**: Consumers maintain their commit offset pointers, allowing rewind, replay, and independent processing rates without modifying source data.

## 3. Delivery Guarantees
- **At-Most-Once**: Consumer commits offset before processing. Fast, but risks data loss on consumer crashes.
- **At-Least-Once (Default)**: Consumer processes event and then commits offset. Guarantees no loss, but requires consumer idempotency for duplicate prevention.
- **Exactly-Once (EOS)**: Combines idempotent producers and transactional commits across Kafka topics and consumers.

## 4. Key Architectural Trade-offs
- **Throughput vs Latency**: Batching messages (`linger.ms` and `batch.size`) maximizes gigabyte-per-second throughput at the cost of milliseconds of added latency.
- **Partition Count vs Overhead**: More partitions increase consumer concurrency, but excessively high partition counts ($>10,000$) increase zookeeper/metadata coordination overhead and file descriptors.

## 5. Failure Modes & Anti-Patterns
- **Consumer Lag Accumulation**: Consumer processing speed is slower than producer ingress, causing latency spikes and storage exhaustion.
- **Hot Partitions**: Poor partition key selection (e.g. static tenant IDs) concentrates 90% of traffic onto a single broker partition, bottlenecking the cluster.
- **Poison Pill Messages**: Malformed payloads repeatedly crash consumers. Mitigation: Dead-Letter Queues (DLQ).

## 6. Architecture Rules & Metrics
- **Partition Sizing**: Target 1 partition per $10\text{MB/s}$ write throughput.
- **Replication Factor**: Always set `min.insync.replicas=2` and `replication.factor=3` in production environments.
