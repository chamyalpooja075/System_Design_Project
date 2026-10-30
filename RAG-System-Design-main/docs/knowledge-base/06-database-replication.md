---
title: Database Replication & High Availability
topic: Database Resilience & Fault Tolerance
keywords: [database replication, primary-replica, active-active, replication lag, split-brain, read replicas, quorum]
recommendedFor: [high-availability relational databases, read-heavy workloads, disaster recovery]
---

# Database Replication & High Availability

## 1. Overview & Purpose
Database replication copies data across multiple database nodes to guarantee data redundancy, eliminate single points of failure (SPOF), and scale read query throughput.

## 2. Replication Topologies
- **Primary-Replica (Leader-Follower)**:
  - All write transactions execute on a single Primary node.
  - Changes stream asynchronously or semi-synchronously to one or more Read Replicas.
  - Read replicas absorb read query volume and act as standby failover targets.
- **Multi-Primary (Active-Active)**:
  - Writes are accepted at multiple geographically dispersed primary nodes.
  - Requires conflict detection and resolution protocols (e.g., Last-Write-Wins, CRDTs, or vector clocks).
  - High risk of write collision anomalies.

## 3. Synchronous vs Asynchronous Replication
- **Synchronous Replication**: Primary waits until at least one replica confirms write persistence before returning success to the client. Guarantees zero data loss (RPO = 0), but write latency increases with network round-trips.
- **Asynchronous Replication**: Primary writes locally and confirms immediately to client, streaming logs in background. Fast, but replica failover after a sudden primary crash risks lost transactions.
- **Semi-Synchronous**: Waits for at least one replica acknowledgement, balancing durability with write speed.

## 4. Key Architectural Trade-offs
- **Read Throughput vs Replication Lag**: Adding read replicas multiplies read capacity, but asynchronous replication lag can cause "read-your-own-writes" anomalies where a user updates their profile and immediately reads stale data.
- **Failover Automation vs Split-Brain**: Automatic leader election without robust quorum algorithms (e.g. Raft/Paxos) can trigger split-brain states where two nodes believe they are the write primary.

## 5. Failure Modes & Mitigations
- **Replication Lag Spikes**: Heavy transactions on the primary choke replication stream workers on replicas. Mitigation: Read-after-write routing (direct user's immediate reads to primary for 5 seconds post-mutation).
- **Replica Desync**: Network partitions cause replicas to fall outside the primary's WAL log retention window, requiring full physical backups to re-seed.

## 6. Architecture Rules & Metrics
- **Minimum Production Replica Count**: At least 1 standby replica with automatic failover (eliminates CRITICAL SPOF).
- **Max Acceptable Replication Lag**: $< 100\text{ms}$ under standard operational load.
