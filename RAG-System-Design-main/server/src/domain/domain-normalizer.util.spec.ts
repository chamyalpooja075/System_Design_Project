import { normalizeToDomainGraph } from './domain-normalizer.util';

describe('DomainNormalizerUtil (Phase 1 & 2 Foundations)', () => {
  it('should strip UI coordinates and styles and produce a clean DomainGraph', () => {
    const rawNodes = [
      {
        id: 'node-client',
        position: { x: 120, y: 350 },
        data: { label: 'Web Browser', category: 'client', technology: 'react' },
      },
      {
        id: 'node-db',
        position: { x: 500, y: 350 },
        data: { label: 'PostgreSQL DB', category: 'database', technology: 'postgresql', replicas: 2 },
      },
    ];

    const rawEdges = [
      {
        id: 'edge-1',
        source: 'node-client',
        target: 'node-db',
        data: { protocol: 'SQL', isAsync: false },
      },
    ];

    const graph = normalizeToDomainGraph(rawNodes, rawEdges);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);

    // Verify UI coordinates are removed
    expect((graph.nodes[0] as any).position).toBeUndefined();
    expect(graph.nodes[0].category).toBe('client');
    expect(graph.nodes[1].replicas).toBe(2);

    // Verify graph degree maps
    expect(graph.outDegrees.get('node-client')).toBe(1);
    expect(graph.inDegrees.get('node-db')).toBe(1);
  });
});
