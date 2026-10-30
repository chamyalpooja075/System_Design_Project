import { DomainGraph, DomainNode, DomainEdge } from './domain-model.interface';

export function normalizeToDomainGraph(rawNodes: any[], rawEdges: any[]): DomainGraph {
  const validCategories: Array<DomainNode['category']> = [
    'client',
    'gateway',
    'service',
    'database',
    'cache',
    'queue',
  ];

  const nodes: DomainNode[] = (rawNodes || [])
    .filter((n) => {
      // Exclude annotation shapes, boundary frames, text boxes, sticky notes, freehand sketches
      if (n.data?.isAnnotation) return false;
      if (n.type && n.type !== 'architectureNode') return false;
      return true;
    })
    .map((n) => {
      const data = n.data || {};
      const rawCategory = (data.category || '').toLowerCase().trim();
      let category: DomainNode['category'] = validCategories.includes(rawCategory as any)
        ? (rawCategory as DomainNode['category'])
        : 'service';

      // Fallback inference from label if category was missing or generic
      if (!data.category && data.label) {
        const l = data.label.toLowerCase();
        if (l.includes('db') || l.includes('postgres') || l.includes('sql') || l.includes('mongo')) {
          category = 'database';
        } else if (l.includes('cache') || l.includes('redis') || l.includes('memcached')) {
          category = 'cache';
        } else if (l.includes('queue') || l.includes('kafka') || l.includes('rabbit') || l.includes('sqs')) {
          category = 'queue';
        } else if (l.includes('gateway') || l.includes('kong') || l.includes('envoy') || l.includes('proxy')) {
          category = 'gateway';
        } else if (l.includes('client') || l.includes('browser') || l.includes('mobile')) {
          category = 'client';
        }
      }

      const isStateful = category === 'database' || category === 'queue' || category === 'cache';
      const parsedReplicas = typeof data.replicas === 'number' ? data.replicas : parseInt(data.replicas, 10);
      const replicas = !isNaN(parsedReplicas) && parsedReplicas > 0 ? parsedReplicas : (isStateful ? 1 : 2);

      return {
        id: n.id,
        name: data.label || n.id,
        category,
        technology: data.technology || category,
        replicas,
        isStateful,
      };
    });

  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: DomainEdge[] = (rawEdges || [])
    .filter((e) => {
      const src = e.source || e.sourceId;
      const tgt = e.target || e.targetId;
      return nodeIds.has(src) && nodeIds.has(tgt);
    })
    .map((e) => {
      const data = e.data || {};
      const protocol = data.protocol || (data.isAsync ? 'Pub/Sub' : 'HTTPS');
      const isAsync = data.isAsync === true || protocol === 'Pub/Sub' || protocol === 'Kafka';

      return {
        id: e.id,
        sourceId: e.source || e.sourceId,
        targetId: e.target || e.targetId,
        protocol,
        isAsync,
      };
    });

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
    if (outDegrees.has(e.sourceId)) {
      outDegrees.set(e.sourceId, (outDegrees.get(e.sourceId) || 0) + 1);
    }
    if (inDegrees.has(e.targetId)) {
      inDegrees.set(e.targetId, (inDegrees.get(e.targetId) || 0) + 1);
    }
  });

  return {
    nodes,
    edges,
    adjacencyList,
    inDegrees,
    outDegrees,
  };
}
