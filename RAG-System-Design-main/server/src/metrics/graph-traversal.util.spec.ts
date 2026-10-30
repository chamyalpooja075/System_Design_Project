import { analyzeArchitectureGraph } from './graph-traversal.util';
import { DomainGraph } from '../domain/domain-model.interface';

describe('GraphTraversalUtil & Metrics Engine (Roadmap Contract Verification)', () => {
  it('should detect SPOF on an unreplicated database and resolve when replicas >= 2', () => {
    // 1. Unreplicated DB with incoming edge -> should trigger SPOF
    const graphWithSPOF: DomainGraph = {
      nodes: [
        { id: 'svc-1', name: 'Order Service', category: 'service', technology: 'nestjs', replicas: 2, isStateful: false },
        { id: 'db-1', name: 'Orders DB', category: 'database', technology: 'postgresql', replicas: 1, isStateful: true },
      ],
      edges: [
        { id: 'e1', sourceId: 'svc-1', targetId: 'db-1', protocol: 'SQL', isAsync: false },
      ],
      adjacencyList: new Map([['svc-1', ['db-1']], ['db-1', []]]),
      inDegrees: new Map([['svc-1', 0], ['db-1', 1]]),
      outDegrees: new Map([['svc-1', 1], ['db-1', 0]]),
    };

    const metricsWithSPOF = analyzeArchitectureGraph(graphWithSPOF);
    expect(metricsWithSPOF.databases).toBe(1);
    expect(metricsWithSPOF.services).toBe(1);
    expect(metricsWithSPOF.spof.length).toBeGreaterThan(0);
    expect(metricsWithSPOF.spof[0]).toContain('Orders DB');

    // 2. Replicated DB (replicas = 2) -> should NOT trigger SPOF
    const graphReplicated: DomainGraph = {
      ...graphWithSPOF,
      nodes: [
        { id: 'svc-1', name: 'Order Service', category: 'service', technology: 'nestjs', replicas: 2, isStateful: false },
        { id: 'db-1', name: 'Orders DB', category: 'database', technology: 'postgresql', replicas: 2, isStateful: true },
      ],
    };

    const metricsReplicated = analyzeArchitectureGraph(graphReplicated);
    expect(metricsReplicated.spof).toHaveLength(0);
    expect(metricsReplicated.redundancyScore).toBeGreaterThan(metricsWithSPOF.redundancyScore);
  });

  it('should detect circular dependency loops using Depth-First Search', () => {
    const cyclicGraph: DomainGraph = {
      nodes: [
        { id: 's1', name: 'Auth Service', category: 'service', technology: 'nestjs', replicas: 2, isStateful: false },
        { id: 's2', name: 'User Service', category: 'service', technology: 'nestjs', replicas: 2, isStateful: false },
      ],
      edges: [
        { id: 'e1', sourceId: 's1', targetId: 's2', protocol: 'gRPC', isAsync: false },
        { id: 'e2', sourceId: 's2', targetId: 's1', protocol: 'gRPC', isAsync: false },
      ],
      adjacencyList: new Map([
        ['s1', ['s2']],
        ['s2', ['s1']],
      ]),
      inDegrees: new Map([['s1', 1], ['s2', 1]]),
      outDegrees: new Map([['s1', 1], ['s2', 1]]),
    };

    const metrics = analyzeArchitectureGraph(cyclicGraph);
    expect(metrics.cycles).toBeDefined();
    expect(metrics.cycles!.length).toBeGreaterThan(0);
    expect(metrics.warnings?.some((w) => w.includes('Circular Dependency'))).toBe(true);
  });

  it('should adhere strictly to the exact Metrics Output Contract shape', () => {
    const emptyGraph: DomainGraph = {
      nodes: [],
      edges: [],
      adjacencyList: new Map(),
      inDegrees: new Map(),
      outDegrees: new Map(),
    };

    const metrics = analyzeArchitectureGraph(emptyGraph);

    expect(metrics).toHaveProperty('services');
    expect(metrics).toHaveProperty('databases');
    expect(metrics).toHaveProperty('caches');
    expect(metrics).toHaveProperty('queues');
    expect(metrics).toHaveProperty('spof');
    expect(metrics).toHaveProperty('fanOut');
    expect(metrics).toHaveProperty('redundancyScore');
    expect(Array.isArray(metrics.spof)).toBe(true);
  });
});
