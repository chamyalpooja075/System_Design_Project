---
title: API Rate Limiting & Abuse Prevention
topic: API Security & Traffic Shaping
keywords: [rate limiting, token bucket, leaky bucket, sliding window counter, fixed window, 429 too many requests, redis]
recommendedFor: [public APIs, resource exhaustion prevention, brute-force defense, multi-tenant fairness]
---

# API Rate Limiting & Abuse Prevention

## 1. Overview & Purpose
API Rate Limiting restricts the frequency of requests a client or service can make over a specific time window. It prevents distributed denial-of-service (DDoS), shields costly third-party AI APIs from quota exhaustion, and protects shared database connection pools.

## 2. Core Rate Limiting Algorithms
- **Token Bucket**:
  - Tokens are continuously added to a bucket at a fixed rate $R$. The bucket has a maximum capacity $B$.
  - Each request removes one token. If no tokens exist, the request is rejected with HTTP 429.
  - *Advantage*: Allows controlled bursts of traffic up to capacity $B$.
- **Leaky Bucket**:
  - Requests enter a FIFO queue and leak out at a constant, smooth output rate.
  - *Advantage*: Perfect traffic smoothing, eliminates spiky load on downstream databases.
- **Fixed Window Counter**:
  - Tracks request count in fixed intervals (e.g., 00:00 to 00:01). Resets counter at interval boundary.
  - *Disadvantage*: Prone to boundary bursts (client sends 100% of quota at 00:59 and 100% at 01:01, doubling allowable traffic).
- **Sliding Window Log**:
  - Keeps sorted timestamp set of all requests in Redis. Computes count in `[now - window, now]`.
  - *Advantage*: Perfectly accurate. *Disadvantage*: High memory usage per user key.
- **Sliding Window Counter**:
  - Blends the previous window count and current window count using a weighted formula:
    $$\text{Count} = \text{Count}_{\text{prev}} \times (1 - \text{progress}) + \text{Count}_{\text{current}}$$
  - *Advantage*: Memory-efficient (two numbers) and prevents window boundary spikes.

## 3. Distributed Implementation via Redis
Rate limiting is centralized in Redis using atomic Lua scripts or `INCR` + `EXPIRE` commands to avoid race conditions across multiple horizontal API gateway instances.

## 4. Key Architectural Trade-offs
- **Granularity vs Memory Footprint**: Rate limiting per `IP:endpoint` requires far more Redis keys than global per-user limits.
- **Fail-Open vs Fail-Closed**: If the central Redis rate-limiter cluster crashes:
  - *Fail-Open*: Allow traffic through to prevent service outage, risking database saturation.
  - *Fail-Closed*: Block incoming traffic to protect backend services, causing user-facing downtime.

## 5. Architecture Rules & Standard Headers
- **Standard HTTP Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests permitted per window.
  - `X-RateLimit-Remaining`: Number of requests remaining in current window.
  - `Retry-After`: Seconds to wait before retrying after receiving HTTP 429.
