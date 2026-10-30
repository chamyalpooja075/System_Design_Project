---
title: API Gateway Patterns & Backend-for-Frontend (BFF)
topic: API Architecture & Ingress Security
keywords: [api gateway, bff, reverse proxy, authentication, rate limiting, request aggregation, envoy, kong]
recommendedFor: [microservices ingress, mobile vs web payload tailoring, centralized security enforcement]
---

# API Gateway Patterns & Backend-for-Frontend (BFF)

## 1. Overview & Purpose
An API Gateway acts as a single ingress reverse proxy and reverse orchestration layer positioned between external clients (web, mobile, third-party) and internal microservices. It offloads non-functional cross-cutting concerns from application code.

## 2. Core API Gateway Responsibilities
- **Centralized Authentication & JWT Verification**: Validates tokens, checks revoked blacklists in Redis, and injects sanitized user headers (`X-User-Id`, `X-User-Roles`) into downstream RPCs.
- **Dynamic Routing & Path Rewriting**: Maps clean public URLs (`/api/v1/orders`) to internal service endpoints (`orders-service.internal:50051`).
- **Global Rate Limiting & Throttling**: Protects downstream microservices from traffic bursts before packets ever enter private VPC subnets.
- **Protocol Translation**: Translates incoming public HTTP/JSON requests into high-performance internal gRPC messages.
- **Request Aggregation (API Composition)**: Consolidates calls to 3 separate backend services into a single unified JSON response to reduce mobile client radio awake cycles.

## 3. The Backend-for-Frontend (BFF) Variant
Instead of a single monolithic API Gateway serving all client types:
- **Web BFF**: Delivers rich, dense payloads optimized for broadband desktop displays.
- **Mobile BFF**: Returns lightweight, compressed JSON with only fields required for smaller screens, filtering out heavy nested objects.

## 4. Key Architectural Trade-offs
- **Consolidation vs Single Point of Failure**: Consolidating routing and security simplifies governance, but if the API Gateway fails, the entire application becomes unreachable. Must be deployed across multiple availability zones.
- **Smart Gateway Anti-Pattern**: Avoid embedding complex business logic inside the gateway layer. The gateway should remain a thin, high-performance routing and security proxy.

## 5. Failure Modes & Mitigations
- **Gateway CPU Saturation**: Heavy JSON parsing and SSL handshake processing can starve gateway worker threads. *Fix*: Offload TLS termination to an upstream L4 Load Balancer (NLB).
- **Latency Bloat from Over-Aggregation**: Calling multiple slow microservices sequentially inside the gateway multiplies client latency. *Fix*: Parallel scatter-gather execution with timeouts.

## 6. Architecture Rules & Metrics
- **Gateway Hop Latency**: Gateway processing overhead should remain $\le 5\text{ms}$ (P95).
- **Zero Raw DB Exposure**: External clients must never connect directly to databases; all ingress flows through an authenticated gateway tier.
