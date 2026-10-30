import type { Node, Edge } from '@xyflow/react';
import type { ArchitectureNodeData, ComponentCategory, MetricSummary } from '../types/architecture';

export interface ArchitectureProblem {
  id: string;
  nodeId?: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'spof' | 'cycle' | 'security' | 'traffic' | 'caching';
  problem: string;
  impact: string;
  solution: string;
  quickFix?: {
    label: string;
    actionType: 'scale_replica' | 'focus_node' | 'add_component';
    targetNodeId?: string;
    targetNodeIds?: string[];
    targetReplicas?: number;
    catalogId?: string;
  };
}

export interface ArchitectureBestPractice {
  id: string;
  title: string;
  description: string;
  category: 'reliability' | 'security' | 'scalability' | 'topology';
}

export interface ComponentMetricDetail {
  id: string;
  label: string;
  category: ComponentCategory;
  technology: string;
  replicas: number;
  purpose: string;
  inDegree: number;
  outDegree: number;
  isSpof: boolean;
  brandColor?: string;
}

export interface EvaluatedMetrics extends MetricSummary {
  loadBalancers: number;
  cycles: string[][];
  warnings: string[];
  problems: ArchitectureProblem[];
  bestPractices: ArchitectureBestPractice[];
  componentDetails: ComponentMetricDetail[];
}

function getComponentPurpose(category: ComponentCategory, technology?: string): string {
  switch (category) {
    case 'client':
      return 'User-facing client application (Web / Mobile) initiating inbound requests and consuming APIs.';
    case 'gateway':
      return 'Ingress API Gateway & Reverse Proxy managing TLS termination, authentication, rate limiting, and traffic routing.';
    case 'service':
      return 'Domain Microservice executing business logic, transactional workflows, and internal compute operations.';
    case 'database':
      return 'Authoritative persistence layer storing ACID relational tables or structured document collections.';
    case 'cache':
      return 'Sub-millisecond (<2ms) in-memory caching tier reducing database query latency and IOPS load.';
    case 'queue':
      return 'Asynchronous message broker buffering traffic bursts, enabling event-driven decoupling and pub/sub streaming.';
    default:
      return technology ? `Architectural component based on ${technology}.` : 'System architecture component.';
  }
}

/**
 * Deterministic Architecture Graph Analyzer
 * Computes component tallies, degree maps, fan-out, circular dependencies, SPOF risks, and redundancy score.
 * Executed in 0ms synchronously whenever nodes or edges change.
 */
export function calculateArchitectureMetrics(
  rawNodes: Node[],
  rawEdges: Edge[]
): EvaluatedMetrics {
  // 1. Filter out UI annotations, frames, text nodes, sticky notes, and drawing strokes
  const archNodes = (rawNodes || []).filter((n) => {
    if ((n.data as any)?.isAnnotation) return false;
    if (n.type && n.type !== 'architectureNode') return false;
    return true;
  });

  const nodeMap = new Map<string, ArchitectureNodeData & { id: string }>();
  archNodes.forEach((n) => {
    const d = (n.data || {}) as unknown as ArchitectureNodeData;
    nodeMap.set(n.id, {
      id: n.id,
      label: d.label || n.id,
      category: d.category || 'service',
      technology: d.technology || '',
      replicas: typeof d.replicas === 'number' && d.replicas > 0 ? d.replicas : (d.category === 'database' ? 1 : 2),
      catalogId: d.catalogId,
      brandColor: d.brandColor,
    });
  });

  const validNodeIds = new Set(nodeMap.keys());

  // 2. Filter edges to only those connecting valid architectural components
  const validEdges = (rawEdges || []).filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  // 3. Build Adjacency List & Degree Maps
  const adjacencyList = new Map<string, string[]>();
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();

  validNodeIds.forEach((id) => {
    adjacencyList.set(id, []);
    inDegrees.set(id, 0);
    outDegrees.set(id, 0);
  });

  validEdges.forEach((e) => {
    adjacencyList.get(e.source)?.push(e.target);
    outDegrees.set(e.source, (outDegrees.get(e.source) || 0) + 1);
    inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
  });

  // 4. Component Classification & SPOF Detection
  let services = 0;
  let databases = 0;
  let caches = 0;
  let queues = 0;
  let loadBalancers = 0;
  const spof: string[] = [];
  const warnings: string[] = [];
  const problems: ArchitectureProblem[] = [];
  const spofNodeIds = new Set<string>();

  archNodes.forEach((n) => {
    const node = nodeMap.get(n.id);
    if (!node) return;

    const inDegree = inDegrees.get(node.id) || 0;
    const replicas = node.replicas ?? (node.category === 'database' ? 1 : 2);

    switch (node.category) {
      case 'service':
        services++;
        if (replicas <= 1 && inDegree > 1) {
          spof.push(`${node.label} (Single service instance handling ${inDegree} consumers)`);
          spofNodeIds.add(node.id);
          problems.push({
            id: `spof-srv-${node.id}`,
            nodeId: node.id,
            title: `High-Risk Single Instance: ${node.label}`,
            severity: 'warning',
            category: 'spof',
            problem: `Service "${node.label}" has only 1 instance but serves ${inDegree} upstream callers.`,
            impact: `Traffic spikes or slow downstream calls will saturate CPU/thread pools, risking cascading timeouts across all ${inDegree} consumers.`,
            solution: `Scale to 2 or more replicas behind an internal load balancer with automated health checking and rolling deployment.`,
            quickFix: {
              label: 'Scale to 2 Replicas',
              actionType: 'scale_replica',
              targetNodeId: node.id,
              targetReplicas: 2,
            },
          });
        }
        break;

      case 'database':
        databases++;
        if (replicas <= 1 && inDegree > 0) {
          spof.push(`${node.label} (Unreplicated primary database)`);
          spofNodeIds.add(node.id);
          problems.push({
            id: `spof-db-${node.id}`,
            nodeId: node.id,
            title: `Single Point of Failure: ${node.label}`,
            severity: 'critical',
            category: 'spof',
            problem: `Primary database "${node.label}" operates on 1 single instance without a standby failover replica.`,
            impact: `If this database instance experiences hardware failure, OOM termination, or maintenance downtime, 100% of read and write transactions will fail immediately, causing total system outage (High MTTR).`,
            solution: `Configure a hot standby replica (replicas ≥ 2) with automated health probes and automatic failover promotion.`,
            quickFix: {
              label: 'Scale to 2 Replicas',
              actionType: 'scale_replica',
              targetNodeId: node.id,
              targetReplicas: 2,
            },
          });
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
        if (replicas <= 1 && inDegree > 0) {
          spof.push(`${node.label} (Single ingress gateway with no redundancy)`);
          spofNodeIds.add(node.id);
          problems.push({
            id: `spof-gw-${node.id}`,
            nodeId: node.id,
            title: `Single Point of Failure: Ingress ${node.label}`,
            severity: 'critical',
            category: 'spof',
            problem: `Ingress Gateway "${node.label}" is operating as a single instance handling edge traffic.`,
            impact: `Any gateway container crash terminates all inbound client traffic at the edge, rendering all upstream services unreachable.`,
            solution: `Deploy at least 2 gateway instances behind a DNS round-robin or Cloud L4 load balancer with active health checks.`,
            quickFix: {
              label: 'Scale to 2 Gateways',
              actionType: 'scale_replica',
              targetNodeId: node.id,
              targetReplicas: 2,
            },
          });
        }
        break;

      case 'client':
        // Inverted traffic flow check: Client receiving backend service requests
        if (inDegree > 0) {
          warnings.push(
            `Inverted Flow: "${node.label}" is marked as a Client, but receives incoming calls from backend services.`
          );
          problems.push({
            id: `inverted-flow-${node.id}`,
            nodeId: node.id,
            title: `Inverted Traffic Flow: ${node.label}`,
            severity: 'warning',
            category: 'traffic',
            problem: `Component "${node.label}" is categorized as a Client, but has ${inDegree} incoming connections from backend services.`,
            impact: `Public clients (browsers/mobile apps) operate behind firewalls/NAT and cannot receive unsolicited inbound TCP/HTTP connections without WebSockets, Webhooks, or push gateways.`,
            solution: `If this is an event/push target, configure WebSocket/SSE edge protocols. If it is an internal service, update its category in the Node Inspector.`,
            quickFix: {
              label: 'Inspect Client Node',
              actionType: 'focus_node',
              targetNodeId: node.id,
            },
          });
        }

        // Direct Client -> Database security alert check
        const targets = adjacencyList.get(node.id) || [];
        targets.forEach((targetId) => {
          const targetNode = nodeMap.get(targetId);
          if (targetNode?.category === 'database') {
            warnings.push(
              `Security Alert: ${node.label} is directly connected to ${targetNode.label} without an API Gateway or Service layer.`
            );
            problems.push({
              id: `sec-client-db-${node.id}-${targetId}`,
              nodeId: node.id,
              title: `Critical Security Exposure: Client directly accessing Database`,
              severity: 'critical',
              category: 'security',
              problem: `"${node.label}" is directly connected to "${targetNode.label}" without an intermediate API Gateway or Service layer.`,
              impact: `Exposes database ports and credentials to public or untrusted clients. Leaves datastore open to SQL injection, credential exfiltration, and connection pool exhaustion.`,
              solution: `Insert an API Gateway and Backend Service layer to authenticate requests, validate schemas, and enforce least-privilege DB access.`,
              quickFix: {
                label: 'Inspect Client Connection',
                actionType: 'focus_node',
                targetNodeId: node.id,
              },
            });
          }
        });
        break;
    }
  });

  // 5. Cycle Detection using Depth-First Search (DFS)
  const cycles: string[][] = [];
  const cycleNodeIdSets: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const rawCycleIds = path.slice(cycleStartIndex);
          rawCycleIds.push(neighbor);
          cycleNodeIdSets.push(rawCycleIds);

          const cyclePath = rawCycleIds.map((id) => nodeMap.get(id)?.label || id);
          cycles.push(cyclePath);
          warnings.push(`Circular Dependency Detected: ${cyclePath.join(' -> ')}`);

          problems.push({
            id: `cycle-${rawCycleIds.join('-')}`,
            nodeId: neighbor,
            title: `Circular Dependency Loop Detected`,
            severity: 'critical',
            category: 'cycle',
            problem: `Circular call loop identified: ${cyclePath.join(' → ')}.`,
            impact: `Tight bidirectional coupling leads to distributed deadlocks, infinite retry storms, thread pool starvation, and prevents isolated service deployments.`,
            solution: `Break the dependency cycle by converting synchronous RPC calls into asynchronous events via a message broker (e.g. Kafka/RabbitMQ) or extracting shared state into a dedicated microservice.`,
            quickFix: {
              label: 'Locate Loop Node',
              actionType: 'focus_node',
              targetNodeId: neighbor,
            },
          });
        }
      }
    }

    path.pop();
    recStack.delete(nodeId);
  }

  validNodeIds.forEach((id) => {
    if (!visited.has(id)) {
      dfs(id);
    }
  });

  // 6. Compute Average Service Fan-Out
  let totalServiceOutDegree = 0;
  let computeServicesCount = 0;

  archNodes.forEach((n) => {
    const node = nodeMap.get(n.id);
    if (node?.category === 'service' || node?.category === 'gateway') {
      computeServicesCount++;
      totalServiceOutDegree += outDegrees.get(node.id) || 0;
    }
  });

  const fanOut = computeServicesCount > 0
    ? Number((totalServiceOutDegree / computeServicesCount).toFixed(1))
    : 0;

  // 7. Architectural Heuristics Warnings & Actionable Problems
  if (services >= 3 && queues === 0) {
    warnings.push(
      'Microservice decoupling notice: 3+ services detected with 0 message queues. Consider introducing asynchronous queues (e.g. Kafka/RabbitMQ) for peak traffic buffering.'
    );
    problems.push({
      id: 'heuristic-missing-queue',
      title: 'Synchronous Coupling Across Microservices',
      severity: 'warning',
      category: 'traffic',
      problem: `Detected ${services} microservices communicating without an asynchronous message broker or event queue.`,
      impact: `Synchronous HTTP/gRPC cascading dependencies magnify tail latency (P99 spikes) and cause cascade failures if downstream services experience transient slowdowns.`,
      solution: `Add an asynchronous event broker (e.g. Apache Kafka or RabbitMQ) to decouple non-blocking tasks, buffer write bursts, and enable publish-subscribe events.`,
      quickFix: {
        label: 'Add Message Queue',
        actionType: 'add_component',
        catalogId: 'data-message-broker',
      },
    });
  }

  if (databases > 0 && caches === 0) {
    warnings.push(
      'High read latency risk: Database exists without an in-memory cache layer (e.g. Redis).'
    );
    problems.push({
      id: 'heuristic-missing-cache',
      title: 'High Read Latency & Database Load Risk',
      severity: 'warning',
      category: 'caching',
      problem: `System features persistent database storage but lacks an in-memory caching tier.`,
      impact: `All read traffic hits disk storage directly, causing elevated latency (15-50ms+), high IOPS costs, and potential database connection pool exhaustion during traffic surges.`,
      solution: `Introduce an in-memory cache (e.g. Redis Cache) between the service layer and database to serve frequently accessed hot reads in <2ms.`,
      quickFix: {
        label: 'Add Redis Cache',
        actionType: 'add_component',
        catalogId: 'db-redis',
      },
    });
  }

  // 8. Build Component Inventory Details
  const componentDetails: ComponentMetricDetail[] = archNodes.map((n) => {
    const node = nodeMap.get(n.id)!;
    const inDeg = inDegrees.get(node.id) || 0;
    const outDeg = outDegrees.get(node.id) || 0;
    const isSpofNode = spofNodeIds.has(node.id);

    return {
      id: node.id,
      label: node.label,
      category: node.category,
      technology: node.technology || '',
      replicas: typeof node.replicas === 'number' ? node.replicas : 1,
      purpose: getComponentPurpose(node.category, node.technology),
      inDegree: inDeg,
      outDegree: outDeg,
      isSpof: isSpofNode,
      brandColor: node.brandColor,
    };
  });

  // 9. Verified Architectural Best Practices Checklist
  const bestPractices: ArchitectureBestPractice[] = [];

  if (cycles.length === 0 && archNodes.length >= 2) {
    bestPractices.push({
      id: 'bp-dag',
      title: 'Directed Acyclic Graph (DAG) Verified',
      description: 'Zero circular dependency loops detected. All service flows follow clean directional hierarchy.',
      category: 'topology',
    });
  }

  if (caches > 0) {
    bestPractices.push({
      id: 'bp-cache',
      title: 'In-Memory Caching Active',
      description: 'Cache tier deployed, absorbing hot read queries and protecting persistent datastore IOPS.',
      category: 'scalability',
    });
  }

  if (queues > 0) {
    bestPractices.push({
      id: 'bp-queue',
      title: 'Asynchronous Decoupling Enabled',
      description: 'Message broker / event stream buffers peak traffic surges and isolates service failures.',
      category: 'scalability',
    });
  }

  if (loadBalancers > 0) {
    bestPractices.push({
      id: 'bp-gateway',
      title: 'Edge Ingress & Reverse Proxy Configured',
      description: 'Central ingress gateway handles TLS termination, routing, and protects internal services from direct public exposure.',
      category: 'security',
    });
  }

  if (databases > 0 && spof.every((s) => !s.toLowerCase().includes('database'))) {
    bestPractices.push({
      id: 'bp-ha-db',
      title: 'High Availability Database Storage',
      description: 'All database instances have redundant standby/read replicas configured for seamless failover.',
      category: 'reliability',
    });
  }

  if (spof.length === 0 && archNodes.length >= 2) {
    bestPractices.push({
      id: 'bp-zero-spof',
      title: 'Zero Single Points of Failure',
      description: 'All active compute, storage, and ingress nodes meet high-availability multi-instance redundancy criteria.',
      category: 'reliability',
    });
  }

  // 10. Deterministic Redundancy Score Calculation (0 to 100)
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
    problems,
    bestPractices,
    componentDetails,
  };
}
