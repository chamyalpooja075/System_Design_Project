import { Injectable, Logger } from '@nestjs/common';
import { normalizeToDomainGraph } from '../domain/domain-normalizer.util';
import { analyzeArchitectureGraph } from './graph-traversal.util';
import { MetricsOutputContract } from '../domain/domain-model.interface';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  evaluate(rawNodes: any[], rawEdges: any[]): MetricsOutputContract {
    const domainGraph = normalizeToDomainGraph(rawNodes, rawEdges);
    const metrics = analyzeArchitectureGraph(domainGraph);

    this.logger.debug(
      `Evaluated diagram: ${metrics.services} services, ${metrics.databases} DBs, ${metrics.spof.length} SPOFs, Score: ${metrics.redundancyScore}`
    );

    return metrics;
  }
}
