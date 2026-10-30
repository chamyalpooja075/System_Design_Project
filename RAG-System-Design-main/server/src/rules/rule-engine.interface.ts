import { DomainGraph, MetricsOutputContract } from '../domain/domain-model.interface';

export type RuleSeverity = 'CRITICAL' | 'WARNING' | 'SUGGESTION';
export type RuleCategory = 'RELIABILITY' | 'PERFORMANCE' | 'SECURITY' | 'SCALABILITY';

export interface RuleViolation {
  id: string;
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  title: string;
  message: string;
  impact: string;
  remediation: string;
  affectedNodes?: string[];
}

export interface ArchitectureRule {
  id: string;
  name: string;
  severity: RuleSeverity;
  category: RuleCategory;
  evaluate(graph: DomainGraph, metrics: MetricsOutputContract): RuleViolation | null;
}
