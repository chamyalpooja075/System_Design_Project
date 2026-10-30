---
title: Failover Strategies & High-Availability Design
topic: Resilience & Disaster Recovery
keywords: [failover, high availability, active-passive, active-active, heartbeat, rpo, rto, split-brain, health checks]
recommendedFor: [mission-critical infrastructure, zero-downtime architectures, disaster recovery planning]
---

# Failover Strategies & High-Availability Design

## 1. Overview & Purpose
High Availability (HA) ensures a system remains operational and accessible during component failures without human intervention. Failover is the automated transition from a degraded primary node or data center to a healthy redundant backup.

## 2. Core HA Topologies
- **Active-Passive (Hot Standby)**:
  - Primary node serves $100\%$ of production traffic while the Secondary node sits idle, continuously synchronizing state via database replication or storage mirroring.
  - Upon primary failure, health check monitors promote the Secondary to Primary.
  - *Advantage*: Zero split-brain concurrency issues.
  - *Disadvantage*: $50\%$ of paid server capacity sits unused.
- **Active-Active (Multi-Primary / Multi-Region)**:
  - Both nodes or regions concurrently serve live user traffic.
  - If Region A fails, global DNS (Route53 Anycast) immediately diverts all incoming traffic to Region B.
  - *Advantage*: Full resource utilization, zero idle waste.
  - *Disadvantage*: Requires distributed data conflict resolution and cross-region replication bandwidth.

## 3. Key Recovery Metrics: RTO and RPO
- **Recovery Time Objective (RTO)**: The maximum acceptable duration of system downtime following a disaster before service must be restored.
- **Recovery Point Objective (RPO)**: The maximum acceptable amount of data loss measured in time (e.g. up to 60 seconds of un-replicated transactions).

| Availability Tier | Annual Downtime | Target Architecture Pattern |
| :--- | :--- | :--- |
| **99.9% (Three Nines)** | 8.76 hours | Multi-instance within single availability zone |
| **99.99% (Four Nines)** | 52.6 minutes | Multi-AZ active-passive with automated failover |
| **99.999% (Five Nines)** | 5.26 minutes | Multi-region active-active with automated Anycast traffic shifting |

## 4. Failure Modes & Mitigations
- **Split-Brain Syndrome**: A transient network partition disconnects Node A and Node B. Both believe the other has died, and both promote themselves to primary, corrupting data. *Mitigation*: Odd-numbered quorum witnesses (3 or 5 nodes) with Raft consensus.
- **Flapping (Ping-Pong) Failover**: An overloaded node fails a health check, causing failover to the standby; the standby immediately becomes overloaded and fails, bouncing traffic back and forth indefinitely. *Mitigation*: Hysteresis thresholds and exponential backoff.

## 5. Architecture Rules & Metrics
- **Automated Health Check Interval**: 5-second polling interval with 3-consecutive failure trigger ($15\text{s}$ detection time).
- **Zero Single Point of Failure (SPOF)**: Every critical tier (Gateway, App, Database, Cache) MUST have $N \ge 2$ instances across distinct availability zones.
