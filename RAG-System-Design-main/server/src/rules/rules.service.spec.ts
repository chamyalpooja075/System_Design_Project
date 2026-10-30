import { RulesService } from './rules.service';
import { DomainGraph, DomainNode, DomainEdge, MetricsOutputContract } from '../domain/domain-model.interface';

const createMockGraph = (nodes: DomainNode[], edges: DomainEdge[] = []): DomainGraph => {
  const adjacencyList = new Map<string, string[]>();
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();

  nodes.forEach((n) => {
    adjacencyList.set(n.id, []);
    inDegrees.set(n.id, 0);
    outDegrees.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adjacencyList.has(e.sourceId)) {
      adjacencyList.get(e.sourceId)!.push(e.targetId);
    }
    inDegrees.set(e.targetId, (inDegrees.get(e.targetId) || 0) + 1);
    outDegrees.set(e.sourceId, (outDegrees.get(e.sourceId) || 0) + 1);
  });

  return { nodes, edges, adjacencyList, inDegrees, outDegrees };
};

describe('RulesService & Standalone Rule Engine (Phase 3.5 Verification)', () => {
  let rulesService: RulesService;

  beforeEach(() => {
    rulesService = new RulesService();
  });

  it('should detect SPOF when a database has 1 replica', () => {
    const graph = createMockGraph([
      { id: 'db-1', name: 'PostgreSQL', category: 'database', technology: 'postgresql', replicas: 1, isStateful: true },
    ]);
    const metrics: MetricsOutputContract = {
      services: 0,
      databases: 1,
      caches: 0,
      queues: 0,
      spof: ['PostgreSQL'],
      fanOut: 0,
      redundancyScore: 40,
    };

    const violations = rulesService.evaluateRules(graph, metrics);
    const spofViolation = violations.find((v) => v.ruleId === 'RULE_SPOF_DATABASES');
    expect(spofViolation).toBeDefined();
    expect(spofViolation?.severity).toBe('CRITICAL');
  });

  it('should detect direct client-to-database connections as a critical security risk', () => {
    const graph = createMockGraph(
      [
        { id: 'client-1', name: 'Web Browser', category: 'client', technology: 'react', replicas: 1, isStateful: false },
        { id: 'db-1', name: 'Primary DB', category: 'database', technology: 'postgresql', replicas: 2, isStateful: true },
      ],
      [
        { id: 'e1', sourceId: 'client-1', targetId: 'db-1', protocol: 'SQL', isAsync: false },
      ]
    );
    const metrics: MetricsOutputContract = {
      services: 0,
      databases: 1,
      caches: 0,
      queues: 0,
      spof: [],
      fanOut: 0,
      redundancyScore: 70,
    };

    const violations = rulesService.evaluateRules(graph, metrics);
    const secViolation = violations.find((v) => v.ruleId === 'RULE_DIRECT_CLIENT_DB_ACCESS');
    expect(secViolation).toBeDefined();
    expect(secViolation?.severity).toBe('CRITICAL');
  });

  it('should flag missing cache tier when databases exist without caches', () => {
    const graph = createMockGraph(
      [
        { id: 'svc-1', name: 'Auth Service', category: 'service', technology: 'nodejs', replicas: 2, isStateful: false },
        { id: 'db-1', name: 'User DB', category: 'database', technology: 'postgresql', replicas: 2, isStateful: true },
      ],
      [
        { id: 'e1', sourceId: 'svc-1', targetId: 'db-1', protocol: 'SQL', isAsync: false },
      ]
    );
    const metrics: MetricsOutputContract = {
      services: 1,
      databases: 1,
      caches: 0,
      queues: 0,
      spof: [],
      fanOut: 1,
      redundancyScore: 75,
    };

    const violations = rulesService.evaluateRules(graph, metrics);
    const cacheViolation = violations.find((v) => v.ruleId === 'RULE_MISSING_CACHE_TIER');
    expect(cacheViolation).toBeDefined();
    expect(cacheViolation?.severity).toBe('WARNING');
  });

  it('should flag synchronous coupling when >= 3 services exist with 0 queues', () => {
    const graph = createMockGraph([
      { id: 's1', name: 'Service 1', category: 'service', technology: 'go', replicas: 2, isStateful: false },
      { id: 's2', name: 'Service 2', category: 'service', technology: 'go', replicas: 2, isStateful: false },
      { id: 's3', name: 'Service 3', category: 'service', technology: 'go', replicas: 2, isStateful: false },
    ]);
    const metrics: MetricsOutputContract = {
      services: 3,
      databases: 0,
      caches: 0,
      queues: 0,
      spof: [],
      fanOut: 0,
      redundancyScore: 80,
    };

    const violations = rulesService.evaluateRules(graph, metrics);
    const asyncViolation = violations.find((v) => v.ruleId === 'RULE_SYNCHRONOUS_COUPLING');
    expect(asyncViolation).toBeDefined();
    expect(asyncViolation?.severity).toBe('WARNING');
  });

  it('should flag deep fan-out when a service has out-degree >= 4', () => {
    const graph = createMockGraph(
      [
        { id: 'orchestrator', name: 'Checkout Orchestrator', category: 'service', technology: 'java', replicas: 2, isStateful: false },
        { id: 't1', name: 'Target 1', category: 'service', technology: 'go', replicas: 2, isStateful: false },
        { id: 't2', name: 'Target 2', category: 'service', technology: 'go', replicas: 2, isStateful: false },
        { id: 't3', name: 'Target 3', category: 'service', technology: 'go', replicas: 2, isStateful: false },
        { id: 't4', name: 'Target 4', category: 'service', technology: 'go', replicas: 2, isStateful: false },
      ],
      [
        { id: 'e1', sourceId: 'orchestrator', targetId: 't1', protocol: 'HTTPS', isAsync: false },
        { id: 'e2', sourceId: 'orchestrator', targetId: 't2', protocol: 'HTTPS', isAsync: false },
        { id: 'e3', sourceId: 'orchestrator', targetId: 't3', protocol: 'HTTPS', isAsync: false },
        { id: 'e4', sourceId: 'orchestrator', targetId: 't4', protocol: 'HTTPS', isAsync: false },
      ]
    );
    const metrics: MetricsOutputContract = {
      services: 5,
      databases: 0,
      caches: 0,
      queues: 0,
      spof: [],
      fanOut: 4,
      redundancyScore: 70,
    };

    const violations = rulesService.evaluateRules(graph, metrics);
    const fanoutViolation = violations.find((v) => v.ruleId === 'RULE_DEEP_SERVICE_FANOUT');
    expect(fanoutViolation).toBeDefined();
    expect(fanoutViolation?.message).toContain('Checkout Orchestrator');
  });
});
