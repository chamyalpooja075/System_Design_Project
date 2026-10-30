import { ArchitectureRule, RuleViolation } from '../rule-engine.interface';
import { DomainGraph, MetricsOutputContract } from '../../domain/domain-model.interface';

export class DeepFanoutRule implements ArchitectureRule {
  id = 'RULE_DEEP_SERVICE_FANOUT';
  name = 'High Service Outbound Fan-Out';
  severity = 'WARNING' as const;
  category = 'RELIABILITY' as const;

  evaluate(graph: DomainGraph, _metrics: MetricsOutputContract): RuleViolation | null {
    const highFanoutServices: string[] = [];

    for (const node of graph.nodes) {
      if (node.category === 'service') {
        const outDeg = graph.outDegrees?.get(node.id) ?? 0;
        if (outDeg >= 4) {
          highFanoutServices.push(`${node.name} (${outDeg} outbound links)`);
        }
      }
    }

    if (highFanoutServices.length > 0) {
      return {
        id: `${this.id}_${Date.now()}`,
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        title: 'Reliability Warning: High Service Outbound Fan-Out',
        message: `Compute service(s) [${highFanoutServices.join(', ')}] depend synchronously on 4 or more downstream dependencies.`,
        impact: 'High availability vulnerability; service uptime degrades to the product of all downstream dependency uptimes.',
        remediation: 'Decompose orchestrator services or utilize asynchronous pub/sub event broadcasting to decouple dependents.',
      };
    }

    return null;
  }
}
