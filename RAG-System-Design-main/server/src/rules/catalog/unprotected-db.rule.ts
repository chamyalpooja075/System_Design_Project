import { ArchitectureRule, RuleViolation } from '../rule-engine.interface';
import { DomainGraph, MetricsOutputContract } from '../../domain/domain-model.interface';

export class UnprotectedDbRule implements ArchitectureRule {
  id = 'RULE_DIRECT_CLIENT_DB_ACCESS';
  name = 'Direct Client Database Ingress';
  severity = 'CRITICAL' as const;
  category = 'SECURITY' as const;

  evaluate(graph: DomainGraph, _metrics: MetricsOutputContract): RuleViolation | null {
    const directAccessViolations: string[] = [];
    const clientNodeIds = new Set(
      graph.nodes.filter((n) => n.category === 'client').map((n) => n.id)
    );
    const dbNodeIds = new Set(
      graph.nodes.filter((n) => n.category === 'database').map((n) => n.id)
    );

    for (const edge of graph.edges) {
      if (clientNodeIds.has(edge.sourceId) && dbNodeIds.has(edge.targetId)) {
        const client = graph.nodes.find((n) => n.id === edge.sourceId)?.name || edge.sourceId;
        const db = graph.nodes.find((n) => n.id === edge.targetId)?.name || edge.targetId;
        directAccessViolations.push(`${client} -> ${db}`);
      }
    }

    if (directAccessViolations.length > 0) {
      return {
        id: `${this.id}_${Date.now()}`,
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        title: 'Severe Security Risk: Direct Client-to-Database Connection',
        message: `Detected external client directly querying database instances: [${directAccessViolations.join(', ')}].`,
        impact: 'Exposes database ports and credentials to the public internet, bypassing authentication, rate limiting, and query sanitization.',
        remediation: 'Place an API Gateway or Backend-for-Frontend (BFF) service between external clients and the database tier.',
      };
    }

    return null;
  }
}
