import { ArchitectureRule, RuleViolation } from '../rule-engine.interface';
import { DomainGraph, MetricsOutputContract } from '../../domain/domain-model.interface';

export class SpofRule implements ArchitectureRule {
  id = 'RULE_SPOF_DATABASES';
  name = 'Single Point of Failure (SPOF) in Stateful Tier';
  severity = 'CRITICAL' as const;
  category = 'RELIABILITY' as const;

  evaluate(graph: DomainGraph, metrics: MetricsOutputContract): RuleViolation | null {
    const unreplDbs = graph.nodes.filter(
      (n) => n.category === 'database' && (!n.replicas || n.replicas <= 1)
    );

    if (unreplDbs.length > 0) {
      const names = unreplDbs.map((d) => d.name).join(', ');
      return {
        id: `${this.id}_${Date.now()}`,
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        title: 'Single Point of Failure: Unreplicated Database',
        message: `Database(s) [${names}] have only 1 replica configured. A physical instance crash or disk outage will cause catastrophic downtime.`,
        impact: 'Zero failover redundancy; uncontained downtime during hardware or network partitions.',
        remediation: 'Configure at least 1 standby read/failover replica (replicas >= 2) with automated leader election.',
        affectedNodes: unreplDbs.map((d) => d.id),
      };
    }

    return null;
  }
}
