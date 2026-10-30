export type ComponentCategory =
  | 'client'
  | 'gateway'
  | 'service'
  | 'database'
  | 'cache'
  | 'queue';

export type ProtocolType =
  | 'HTTPS'
  | 'HTTP'
  | 'REST API'
  | 'GraphQL'
  | 'gRPC'
  | 'WebSocket'
  | 'TCP'
  | 'UDP'
  | 'SQL'
  | 'NoSQL'
  | 'Kafka'
  | 'AMQP'
  | 'Redis Protocol'
  | 'Pub/Sub'
  | 'SSE'
  | 'MQTT'
  | 'WebRTC'
  | 'DNS'
  | 'SFTP'
  | 'LDAP'
  | 'Webhook'
  | 'mTLS'
  | 'CDC'
  | 'S3 API'
  | 'Custom'
  | string;

export interface ArchitectureEdgeData {
  protocol: ProtocolType;
  isAsync?: boolean;
  label?: string;
  onUpdateProtocol?: (protocol: ProtocolType, isAsync?: boolean) => void;
  [key: string]: unknown;
}

export interface ArchitectureNodeData {
  label: string;
  category: ComponentCategory;
  technology?: string;
  description?: string;
  isPrimary?: boolean;
  replicas?: number;
  catalogId?: string;
  brandColor?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface MetricSummary {
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
}
