import { DomainGraph, MetricsOutputContract } from '../domain/domain-model.interface';

export function analyzeArchitectureGraph(graph: DomainGraph): MetricsOutputContract {
  let services = 0;
  let databases = 0;
  let caches = 0;
  let queues = 0;
  let loadBalancers = 0;
  const spof: string[] = [];
  const warnings: string[] = [];

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // 1. Tally component categories & Detect SPOFs
  graph.nodes.forEach((node) => {
    const inDegree = graph.inDegrees.get(node.id) || 0;
    const outDegree = graph.outDegrees.get(node.id) || 0;

    switch (node.category) {
      case 'service':
        services++;
        if (node.replicas <= 1 && inDegree > 1) {
          spof.push(`${node.name} (Single service instance handling multiple consumers)`);
        }
        break;

      case 'database':
        databases++;
        if (node.replicas <= 1 && inDegree > 0) {
          spof.push(`${node.name} (Unreplicated primary database)`);
        }
        break;

      case 'cache':
        caches++;
        break;

      case 'queue':
        queues++;
        break;

      case 'gateway':
        loadBalancers++;
        if (node.replicas <= 1 && inDegree > 0) {
          spof.push(`${node.name} (Single ingress gateway with no redundancy)`);
        }
        break;
    }

    // Direct Client -> Database security warning
    if (node.category === 'client') {
      const targets = graph.adjacencyList.get(node.id) || [];
      targets.forEach((targetId) => {
        const targetNode = nodeMap.get(targetId);
        if (targetNode?.category === 'database') {
          warnings.push(`Security Alert: ${node.name} is directly connected to ${targetNode.name} without an API Gateway or Service layer.`);
        }
      });
    }
  });

  // 2. Cycle Detection using Depth-First Search (DFS)
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = path
            .slice(cycleStartIndex)
            .map((id) => nodeMap.get(id)?.name || id);
          cyclePath.push(nodeMap.get(neighbor)?.name || neighbor);
          cycles.push(cyclePath);
          warnings.push(`Circular Dependency Detected: ${cyclePath.join(' -> ')}`);
        }
      }
    }

    path.pop();
    recStack.delete(nodeId);
  }

  graph.nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  // 3. Compute Fan-out ratio
  let totalServiceOutDegree = 0;
  let computeServicesCount = 0;

  graph.nodes.forEach((node) => {
    if (node.category === 'service' || node.category === 'gateway') {
      computeServicesCount++;
      totalServiceOutDegree += graph.outDegrees.get(node.id) || 0;
    }
  });

  const fanOut = computeServicesCount > 0
    ? Number((totalServiceOutDegree / computeServicesCount).toFixed(1))
    : 0;

  // 4. Architectural Heuristics
  if (services >= 3 && queues === 0) {
    warnings.push('Microservice decoupling notice: 3+ services detected with 0 message queues. Consider introducing asynchronous queues (e.g. Kafka/RabbitMQ) for peak traffic buffering.');
  }

  if (databases > 0 && caches === 0) {
    warnings.push('High read latency risk: Database exists without an in-memory cache layer (e.g. Redis).');
  }

  // 5. Redundancy Score calculation (0 to 100)
  let score = 100;
  score -= spof.length * 20;
  score -= cycles.length * 15;
  if (databases > 0 && caches === 0) score -= 10;
  if (services >= 3 && queues === 0) score -= 10;
  if (queues > 0) score += 5;
  if (caches > 0) score += 5;

  const redundancyScore = Math.max(15, Math.min(100, score));

  return {
    services,
    databases,
    caches,
    queues,
    loadBalancers,
    spof,
    fanOut,
    redundancyScore,
    cycles,
    warnings,
  };
}
