---
title: Circuit Breaker Pattern & Cascading Failure Prevention
topic: Distributed Systems Resilience & Fault Isolation
keywords: [circuit breaker, cascading failure, bulkhead, retry storm, exponential backoff, jitter, fallback]
recommendedFor: [microservice inter-communication, third-party API integration, distributed fault tolerance]
---

# Circuit Breaker Pattern & Cascading Failure Prevention

## 1. Overview & Purpose
In distributed architectures, transient network hiccups or downstream service slowdowns can exhaust thread pools on calling services, causing a chain reaction of outages known as a **cascading failure**. The **Circuit Breaker** pattern detects failures and encapsulates the logic of preventing a network failure from constantly recurring during maintenance or recovery.

## 2. The Three Circuit Breaker States
1. **CLOSED (Normal Operation)**:
   - Requests flow freely to the downstream service.
   - The breaker measures the rolling success and failure rates.
   - If the error percentage or latency exceeds a predetermined threshold (e.g., $50\%$ errors over 10 seconds), the breaker trips into the **OPEN** state.
2. **OPEN (Failing Fast)**:
   - All subsequent incoming calls immediately fail without attempting to contact the downstream dependency.
   - Returns a graceful cached fallback or error immediately ($<1\text{ms}$), protecting the caller's connection pool and giving the struggling dependency breathing room to recover.
   - Starts a sleep timeout timer (e.g. 30 seconds).
3. **HALF-OPEN (Probing Recovery)**:
   - Once the sleep timer expires, the breaker transitions to HALF-OPEN.
   - A limited trial batch of requests (e.g. 5 requests) is permitted through.
   - If trial requests succeed, the breaker resets to **CLOSED**.
   - If any trial request fails, the breaker re-opens immediately for another sleep cycle.

## 3. Related Resilience Patterns
- **Bulkhead Pattern**: Isolates resources (thread pools, connection pools) into discrete compartments so failure of one pool cannot starve the rest of the application.
- **Exponential Backoff with Full Jitter**:
  - Instead of retrying immediately, clients wait exponentially longer between attempts:
    $$t_{\text{wait}} = \text{random}(0, \min(\text{cap}, \text{base} \times 2^{\text{attempt}}))$$
  - Adding random jitter prevents synchronous "retry storms" from crushing recovering services.

## 4. Key Architectural Trade-offs
- **Graceful Fallback vs Stale Data**: Providing a fallback response (e.g. cached product recommendations) keeps the user interface responsive during outages, but serves slightly stale information.
- **Sensitivity Tuning**: Overly sensitive breakers trip during minor network blips; insufficiently sensitive breakers fail to prevent caller thread exhaustion.

## 5. Architecture Rules & Metrics
- **Trip Condition Baseline**: 5 consecutive 5xx errors or $>50\%$ error rate within a 10-second rolling window.
- **Fallback Requirement**: Every circuit breaker MUST define a deterministic fallback behavior (e.g. empty list, cached snapshot, or explicit degraded message).
