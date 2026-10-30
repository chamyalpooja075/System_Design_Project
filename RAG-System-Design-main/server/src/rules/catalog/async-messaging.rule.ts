import { ArchitectureRule, RuleViolation } from '../rule-engine.interface';
import { DomainGraph, MetricsOutputContract } from '../../domain/domain-model.interface';

export class AsyncMessagingRule implements ArchitectureRule {
  id = 'RULE_SYNCHRONOUS_COUPLING';
  name = 'Heavy Synchronous Coupling (Missing Event Broker)';
  severity = 'WARNING' as const;
  category = 'SCALABILITY' as const;

  evaluate(graph: DomainGraph, metrics: MetricsOutputContract): RuleViolation | null {
    if (metrics.services >= 3 && metrics.queues === 0) {
      return {
        id: `${this.id}_${Date.now()}`,
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        title: 'Scalability Warning: Heavy Synchronous Service Coupling',
        message: `System features ${metrics.services} microservices communicating entirely over synchronous request/response without an asynchronous event bus.`,
        impact: 'Tight temporal coupling; latency compounds across downstream services, and transient network hiccups trigger cascading failures.',
        remediation: 'Introduce an event-driven streaming buffer (Apache Kafka / Redpanda / RabbitMQ) for non-blocking inter-service workflows.',
      };
    }

    return null;
  }
}
