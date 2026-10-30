import type { ProtocolType } from '../types/architecture';

export type ProtocolCategory =
  | 'Web & API'
  | 'Database & Storage'
  | 'Messaging & Streaming'
  | 'Networking & Transport'
  | 'Security & File'
  | 'Custom';

export interface ProtocolDefinition {
  id: string;
  label: string;
  category: ProtocolCategory;
  purpose: string;
  defaultAsync: boolean;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ALL_PROTOCOLS: ProtocolDefinition[] = [
  // --- Web & API ---
  {
    id: 'HTTPS',
    label: 'HTTPS',
    category: 'Web & API',
    purpose: 'Secure HTTP communication (TLS/SSL encryption)',
    defaultAsync: false,
    color: '#6366f1',
    badgeBg: 'bg-indigo-950/90',
    badgeBorder: 'border-indigo-500/50',
    badgeText: 'text-indigo-200',
  },
  {
    id: 'HTTP',
    label: 'HTTP',
    category: 'Web & API',
    purpose: 'Standard plaintext web requests',
    defaultAsync: false,
    color: '#64748b',
    badgeBg: 'bg-slate-900/90',
    badgeBorder: 'border-slate-600/50',
    badgeText: 'text-slate-300',
  },
  {
    id: 'REST API',
    label: 'REST API',
    category: 'Web & API',
    purpose: 'REST-based service communication (JSON/HTTP)',
    defaultAsync: false,
    color: '#06b6d4',
    badgeBg: 'bg-cyan-950/90',
    badgeBorder: 'border-cyan-500/50',
    badgeText: 'text-cyan-200',
  },
  {
    id: 'GraphQL',
    label: 'GraphQL',
    category: 'Web & API',
    purpose: 'Flexible API queries and typed data fetching',
    defaultAsync: false,
    color: '#ec4899',
    badgeBg: 'bg-pink-950/90',
    badgeBorder: 'border-pink-500/50',
    badgeText: 'text-pink-200',
  },
  {
    id: 'gRPC',
    label: 'gRPC',
    category: 'Web & API',
    purpose: 'High-performance microservice RPC (HTTP/2 + Protobuf)',
    defaultAsync: false,
    color: '#8b5cf6',
    badgeBg: 'bg-purple-950/90',
    badgeBorder: 'border-purple-500/50',
    badgeText: 'text-purple-200',
  },
  {
    id: 'WebSocket',
    label: 'WebSocket',
    category: 'Web & API',
    purpose: 'Real-time, bidirectional full-duplex communication',
    defaultAsync: false,
    color: '#38bdf8',
    badgeBg: 'bg-sky-950/90',
    badgeBorder: 'border-sky-500/50',
    badgeText: 'text-sky-200',
  },
  {
    id: 'SSE',
    label: 'SSE',
    category: 'Web & API',
    purpose: 'Server-to-client unidirectional event streaming',
    defaultAsync: true,
    color: '#14b8a6',
    badgeBg: 'bg-teal-950/90',
    badgeBorder: 'border-teal-500/50',
    badgeText: 'text-teal-200',
  },
  {
    id: 'Webhook',
    label: 'Webhook',
    category: 'Web & API',
    purpose: 'Event-driven HTTP push callbacks between platforms',
    defaultAsync: true,
    color: '#a855f7',
    badgeBg: 'bg-purple-950/90',
    badgeBorder: 'border-purple-500/50',
    badgeText: 'text-purple-200',
  },

  // --- Database & Storage ---
  {
    id: 'SQL',
    label: 'SQL',
    category: 'Database & Storage',
    purpose: 'Relational database queries (PostgreSQL, MySQL, Oracle)',
    defaultAsync: false,
    color: '#3b82f6',
    badgeBg: 'bg-blue-950/90',
    badgeBorder: 'border-blue-500/50',
    badgeText: 'text-blue-200',
  },
  {
    id: 'NoSQL',
    label: 'NoSQL',
    category: 'Database & Storage',
    purpose: 'NoSQL database operations (MongoDB, Cassandra, DynamoDB)',
    defaultAsync: false,
    color: '#0284c7',
    badgeBg: 'bg-sky-950/90',
    badgeBorder: 'border-sky-500/50',
    badgeText: 'text-sky-200',
  },
  {
    id: 'Redis Protocol',
    label: 'Redis Protocol',
    category: 'Database & Storage',
    purpose: 'Cache and in-memory key-value access (RESP protocol)',
    defaultAsync: false,
    color: '#dc2626',
    badgeBg: 'bg-red-950/90',
    badgeBorder: 'border-red-500/50',
    badgeText: 'text-red-200',
  },
  {
    id: 'S3 API',
    label: 'S3 API',
    category: 'Database & Storage',
    purpose: 'Object & blob storage API operations (AWS S3, MinIO)',
    defaultAsync: false,
    color: '#ea580c',
    badgeBg: 'bg-orange-950/90',
    badgeBorder: 'border-orange-500/50',
    badgeText: 'text-orange-200',
  },
  {
    id: 'CDC',
    label: 'CDC',
    category: 'Database & Storage',
    purpose: 'Change Data Capture log streaming (Debezium, WAL)',
    defaultAsync: true,
    color: '#ca8a04',
    badgeBg: 'bg-yellow-950/90',
    badgeBorder: 'border-yellow-500/50',
    badgeText: 'text-yellow-200',
  },

  // --- Messaging & Streaming ---
  {
    id: 'Kafka',
    label: 'Kafka',
    category: 'Messaging & Streaming',
    purpose: 'Distributed event streaming & commit log topics',
    defaultAsync: true,
    color: '#e11d48',
    badgeBg: 'bg-rose-950/90',
    badgeBorder: 'border-rose-500/50',
    badgeText: 'text-rose-200',
  },
  {
    id: 'AMQP',
    label: 'AMQP',
    category: 'Messaging & Streaming',
    purpose: 'Enterprise message queue communication (RabbitMQ)',
    defaultAsync: true,
    color: '#f97316',
    badgeBg: 'bg-orange-950/90',
    badgeBorder: 'border-orange-500/50',
    badgeText: 'text-orange-200',
  },
  {
    id: 'Pub/Sub',
    label: 'Pub/Sub',
    category: 'Messaging & Streaming',
    purpose: 'Asynchronous publish/subscribe message decoupling',
    defaultAsync: true,
    color: '#f59e0b',
    badgeBg: 'bg-amber-950/90',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-200',
  },
  {
    id: 'MQTT',
    label: 'MQTT',
    category: 'Messaging & Streaming',
    purpose: 'Lightweight IoT & telemetry publish/subscribe messaging',
    defaultAsync: true,
    color: '#10b981',
    badgeBg: 'bg-emerald-950/90',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-200',
  },

  // --- Networking & Transport ---
  {
    id: 'TCP',
    label: 'TCP',
    category: 'Networking & Transport',
    purpose: 'Reliable connection-oriented byte stream transport',
    defaultAsync: false,
    color: '#d946ef',
    badgeBg: 'bg-fuchsia-950/90',
    badgeBorder: 'border-fuchsia-500/50',
    badgeText: 'text-fuchsia-200',
  },
  {
    id: 'UDP',
    label: 'UDP',
    category: 'Networking & Transport',
    purpose: 'Low-latency connectionless datagram transport (VoIP, DNS, Games)',
    defaultAsync: true,
    color: '#f43f5e',
    badgeBg: 'bg-rose-950/90',
    badgeBorder: 'border-rose-500/50',
    badgeText: 'text-rose-200',
  },
  {
    id: 'WebRTC',
    label: 'WebRTC',
    category: 'Networking & Transport',
    purpose: 'Peer-to-peer real-time media and data streaming',
    defaultAsync: false,
    color: '#06b6d4',
    badgeBg: 'bg-cyan-950/90',
    badgeBorder: 'border-cyan-500/50',
    badgeText: 'text-cyan-200',
  },
  {
    id: 'DNS',
    label: 'DNS',
    category: 'Networking & Transport',
    purpose: 'Domain name resolution and service discovery',
    defaultAsync: false,
    color: '#84cc16',
    badgeBg: 'bg-lime-950/90',
    badgeBorder: 'border-lime-500/50',
    badgeText: 'text-lime-200',
  },
  {
    id: 'mTLS',
    label: 'mTLS',
    category: 'Networking & Transport',
    purpose: 'Mutual TLS cryptographic authentication between services',
    defaultAsync: false,
    color: '#10b981',
    badgeBg: 'bg-emerald-950/90',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-200',
  },

  // --- Security & File ---
  {
    id: 'SFTP',
    label: 'SFTP',
    category: 'Security & File',
    purpose: 'Secure file transfer over encrypted SSH protocol',
    defaultAsync: false,
    color: '#64748b',
    badgeBg: 'bg-slate-900/90',
    badgeBorder: 'border-slate-600/50',
    badgeText: 'text-slate-300',
  },
  {
    id: 'LDAP',
    label: 'LDAP',
    category: 'Security & File',
    purpose: 'Directory services, RBAC, and user authentication',
    defaultAsync: false,
    color: '#6b7280',
    badgeBg: 'bg-gray-900/90',
    badgeBorder: 'border-gray-600/50',
    badgeText: 'text-gray-300',
  },

  // --- Custom ---
  {
    id: 'Custom',
    label: 'Custom',
    category: 'Custom',
    purpose: 'User-defined internal protocol or custom wire format',
    defaultAsync: false,
    color: '#a855f7',
    badgeBg: 'bg-purple-950/90',
    badgeBorder: 'border-purple-500/50',
    badgeText: 'text-purple-200',
  },
];

export const PROTOCOLS_BY_CATEGORY = ALL_PROTOCOLS.reduce<Record<ProtocolCategory, ProtocolDefinition[]>>(
  (acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  },
  {} as Record<ProtocolCategory, ProtocolDefinition[]>
);

export function getProtocolConfig(protocol: string, isAsync?: boolean): ProtocolDefinition {
  const match = ALL_PROTOCOLS.find(
    (p) => p.id.toLowerCase() === protocol.toLowerCase() || p.label.toLowerCase() === protocol.toLowerCase()
  );
  if (match) {
    return {
      ...match,
      defaultAsync: isAsync !== undefined ? isAsync : match.defaultAsync,
    };
  }

  // Fallback for custom user strings
  return {
    id: protocol,
    label: protocol,
    category: 'Custom',
    purpose: 'Custom communication protocol',
    defaultAsync: Boolean(isAsync),
    color: isAsync ? '#f59e0b' : '#6366f1',
    badgeBg: isAsync ? 'bg-amber-950/90' : 'bg-indigo-950/90',
    badgeBorder: isAsync ? 'border-amber-500/50' : 'border-indigo-500/50',
    badgeText: isAsync ? 'text-amber-200' : 'text-indigo-200',
  };
}

export function getProtocolColor(protocol: string, isAsync: boolean, selected?: boolean): string {
  if (selected) return '#38bdf8';
  const cfg = getProtocolConfig(protocol, isAsync);
  return cfg.color;
}

export function inferProtocol(
  sourceCategory?: string,
  targetCategory?: string,
  targetCatalogId?: string,
  targetLabel?: string
): { protocol: ProtocolType; isAsync: boolean; color: string } {
  const catId = (targetCatalogId || '').toLowerCase();
  const label = (targetLabel || '').toLowerCase();

  // 1. Message Streaming / Queues
  if (targetCategory === 'queue' || catId.includes('kafka') || label.includes('kafka')) {
    const isKafka = catId.includes('kafka') || label.includes('kafka');
    const isRabbit = catId.includes('rabbit') || label.includes('rabbit') || catId.includes('amqp');
    const proto: ProtocolType = isKafka ? 'Kafka' : isRabbit ? 'AMQP' : 'Pub/Sub';
    const cfg = getProtocolConfig(proto, true);
    return { protocol: proto, isAsync: true, color: cfg.color };
  }

  // 2. Caches & In-Memory Stores
  if (targetCategory === 'cache' || catId.includes('redis') || label.includes('redis')) {
    const proto: ProtocolType = 'Redis Protocol';
    const cfg = getProtocolConfig(proto, false);
    return { protocol: proto, isAsync: false, color: cfg.color };
  }

  // 3. Databases
  if (targetCategory === 'database') {
    const isNoSql =
      catId.includes('mongo') ||
      label.includes('mongo') ||
      catId.includes('cassandra') ||
      label.includes('cassandra') ||
      catId.includes('dynamo') ||
      label.includes('dynamo');
    const proto: ProtocolType = isNoSql ? 'NoSQL' : 'SQL';
    const cfg = getProtocolConfig(proto, false);
    return { protocol: proto, isAsync: false, color: cfg.color };
  }

  // 4. Gateway -> Service or Service -> Service
  if (sourceCategory === 'gateway' && targetCategory === 'service') {
    const proto: ProtocolType = 'gRPC';
    const cfg = getProtocolConfig(proto, false);
    return { protocol: proto, isAsync: false, color: cfg.color };
  }

  if (sourceCategory === 'service' && targetCategory === 'service') {
    const proto: ProtocolType = 'gRPC';
    const cfg = getProtocolConfig(proto, false);
    return { protocol: proto, isAsync: false, color: cfg.color };
  }

  // 5. Client -> Gateway or Client -> Service
  if (sourceCategory === 'client') {
    const proto: ProtocolType = 'HTTPS';
    const cfg = getProtocolConfig(proto, false);
    return { protocol: proto, isAsync: false, color: cfg.color };
  }

  // Default fallback
  const cfg = getProtocolConfig('HTTPS', false);
  return { protocol: 'HTTPS', isAsync: false, color: cfg.color };
}
