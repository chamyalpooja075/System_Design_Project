import { ArchitectureRule, RuleViolation } from '../rule-engine.interface';
import { DomainGraph, MetricsOutputContract } from '../../domain/domain-model.interface';

export class CacheTrafficRule implements ArchitectureRule {
  id = 'RULE_MISSING_CACHE_TIER';
  name = 'Unshielded Primary Database (Missing In-Memory Caching)';
  severity = 'WARNING' as const;
  category = 'PERFORMANCE' as const;

  evaluate(graph: DomainGraph, metrics: MetricsOutputContract): RuleViolation | null {
    if (metrics.databases > 0 && metrics.caches === 0) {
      return {
        id: `${this.id}_${Date.now()}`,
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        title: 'High Latency Risk: Missing In-Memory Caching Tier',
        message: 'Architecture contains persistent databases but lacks an in-memory caching tier (e.g. Redis / Memcached).',
        impact: 'Repeated read queries hit disk storage directly, causing database CPU saturation and increased P99 latency.',
        remediation: 'Introduce a distributed Redis cache in front of read-heavy microservices using the Cache-Aside pattern.',
      };
    }

    return null;
  }
}
