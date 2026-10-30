---
title: Load Balancers & Traffic Distribution
topic: Networking & Traffic Routing
keywords: [load balancer, l4, l7, round robin, least connections, consistent hashing, reverse proxy, high availability]
recommendedFor: [high-traffic web systems, microservices ingress, horizontal scaling]
---

# Load Balancers & Traffic Distribution

## 1. Overview & Purpose
A Load Balancer distributes incoming network traffic across a cluster of backend compute nodes to prevent single-instance saturation, maximize resource utilization, and eliminate single points of failure (SPOF) at the ingress tier.

## 2. Layer 4 (Transport) vs Layer 7 (Application)
- **Layer 4 (L4 - TCP/UDP)**: Routes traffic based on IP protocol and ports without inspecting message payload. Extremely high packet throughput (e.g. AWS NLB, HAProxy TCP mode).
- **Layer 7 (L7 - HTTP/HTTPS/gRPC)**: Inspects HTTP headers, cookies, URL paths, and JSON payloads. Enables intelligent path-based routing, TLS termination, header injection, and rate limiting (e.g. AWS ALB, NGINX, Envoy).

## 3. Core Routing Algorithms
- **Round Robin**: Distributes requests sequentially across healthy targets. Ideal for homogenous servers with uniform request runtimes.
- **Weighted Round Robin**: Allocates more requests to nodes with higher CPU/memory capacity.
- **Least Connections**: Forwards new requests to the instance serving the fewest active connections. Best for long-lived connections (WebSockets, database pools).
- **Consistent Hashing**: Hashes request attributes (e.g., `client_ip` or `user_id`) to the same server node. Essential for stateful sessions and distributed caches to minimize cache churn during node scale up/down.

## 4. Key Architectural Trade-offs
- **Redundancy vs Infrastructure Cost**: Operating an active-passive or active-active load balancer pair (via VRRP/Keepalived) doubles ingress hardware costs but eliminates catastrophic single-gateway downtime.
- **Latency Overhead**: L7 payload inspection and TLS decryption introduces a $1\text{ms} - 5\text{ms}$ latency penalty compared to raw L4 packet forwarding.

## 5. Failure Modes & Anti-Patterns
- **Unchecked Health Checks**: Too frequent health checks cause "thundering herd" load; too infrequent health checks cause blackholed requests to dead nodes.
- **Single Load Balancer Instance**: Deploying only one load balancer creates an ingress SPOF. Redundancy requires at least 2 instances with DNS round-robin or Anycast BGP IP failover.

## 6. Architecture Rules & Metrics
- **Max Recommended Ingress Fan-Out**: 1 LB instance per 50 backend nodes before introducing regional routing tiers.
- **Health Check Threshold**: 3 consecutive failures before node ejection; 2 consecutive successes before re-admitting.
