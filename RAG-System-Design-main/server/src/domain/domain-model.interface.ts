export interface DomainNode {
  id: string;
  name: string;
  category: 'client' | 'gateway' | 'service' | 'database' | 'cache' | 'queue';
  technology: string;
  replicas: number;
  isStateful: boolean;
}

export interface DomainEdge {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: 'HTTPS' | 'gRPC' | 'SQL' | 'Pub/Sub' | 'WebSocket' | 'TCP';
  isAsync: boolean;
}

export interface DomainGraph {
  nodes: DomainNode[];
  edges: DomainEdge[];
  adjacencyList: Map<string, string[]>;
  inDegrees: Map<string, number>;
  outDegrees: Map<string, number>;
}

export interface MetricsOutputContract {
  services: number;
  databases: number;
  caches: number;
  queues: number;
  loadBalancers?: number;
  spof: string[];
  fanOut: number;
  redundancyScore: number;
  cycles?: string[][];
  warnings?: string[];
  summary?: string;
}
