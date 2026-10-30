import { Injectable, Logger } from '@nestjs/common';
import { DomainGraph, MetricsOutputContract } from '../domain/domain-model.interface';
import { ArchitectureRule, RuleViolation } from './rule-engine.interface';
import { SpofRule } from './catalog/spof.rule';
import { UnprotectedDbRule } from './catalog/unprotected-db.rule';
import { CacheTrafficRule } from './catalog/cache-traffic.rule';
import { AsyncMessagingRule } from './catalog/async-messaging.rule';
import { DeepFanoutRule } from './catalog/deep-fanout.rule';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private readonly rules: ArchitectureRule[] = [
    new SpofRule(),
    new UnprotectedDbRule(),
    new CacheTrafficRule(),
    new AsyncMessagingRule(),
    new DeepFanoutRule(),
  ];

  evaluateRules(graph: DomainGraph, metrics: MetricsOutputContract): RuleViolation[] {
    const startTime = performance.now();
    const violations: RuleViolation[] = [];

    for (const rule of this.rules) {
      try {
        const violation = rule.evaluate(graph, metrics);
        if (violation) {
          violations.push(violation);
        }
      } catch (err: any) {
        this.logger.warn(`Error evaluating rule ${rule.id}: ${err?.message}`);
      }
    }

    const durationMs = (performance.now() - startTime).toFixed(2);
    this.logger.debug(`Rule engine evaluated ${this.rules.length} rules in ${durationMs}ms (found ${violations.length} violations)`);

    return violations;
  }
}
