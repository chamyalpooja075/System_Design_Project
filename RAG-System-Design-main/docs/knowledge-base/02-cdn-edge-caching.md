---
title: Content Delivery Networks (CDN) & Edge Caching
topic: Edge Infrastructure & Content Caching
keywords: [cdn, edge computing, point of presence, pop, cache-control, ttl, geo-dns, anycast]
recommendedFor: [global user base, static asset delivery, read-heavy media applications]
---

# Content Delivery Networks (CDN) & Edge Caching

## 1. Overview & Purpose
A Content Delivery Network (CDN) is a geographically distributed network of proxy servers (Points of Presence - PoPs) that caches content near end-users. It slashes round-trip time (RTT) latency and shields origin servers from massive egress bandwidth spikes.

## 2. Static vs Dynamic Edge Caching
- **Static Asset Caching**: Images, videos, bundled JavaScript/CSS, and HTML files are cached with long TTLs ($86400\text{s}+$). Offloads up to $90\%$ of origin traffic.
- **Dynamic Content & API Caching**: Cache short-lived JSON responses (e.g., product catalogs, user profiles) using `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`.
- **Edge Compute (Serverless at Edge)**: Running lightweight logic (Cloudflare Workers, CloudFront Functions) for geolocation routing, A/B testing, and JWT signature verification.

## 3. Cache Invalidation Strategies
- **Purge by URL / Key**: Immediate edge invalidation via API when underlying records change.
- **Surrogate-Key / Cache-Tagging**: Tagging related resources (e.g. `tag: store-123`) and invalidating all matching items atomically across the globe.
- **Cache-Busting (Fingerprinting)**: Bundling static assets with hash fingerprints (`main.8f21bc.js`). Eliminates manual edge purging.

## 4. Key Architectural Trade-offs
- **Stale Reads vs Origin Load**: Aggressive caching reduces origin cost and latency ($<20\text{ms}$) but risks users seeing outdated data until TTL expiration or purge completion.
- **Purge Latency**: Global purge propagation across hundreds of PoPs takes between $150\text{ms}$ and $30\text{s}$, creating a temporary inconsistency window.

## 5. Failure Modes & Anti-Patterns
- **Cache Stampede (Thundering Herd)**: When a widely requested asset expires, thousands of edge requests simultaneously hit the origin backend. Mitigation: Request collapsing / origin shielding.
- **Caching Authenticated / PII Data**: Failing to specify `Cache-Control: private` can cause intermediate edge caches to serve user A's private profile to user B.

## 6. Architecture Rules & Metrics
- **Target Edge Cache Hit Ratio**: $\ge 85\%$ for media assets; $\ge 60\%$ for public read APIs.
- **Origin Shield Tier**: Introduce a centralized regional cache between edge PoPs and origin to consolidate origin queries.
