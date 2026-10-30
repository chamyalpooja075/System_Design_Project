import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { 
  Monitor, 
  Network, 
  Server, 
  Database, 
  Zap, 
  Radio, 
  AlertTriangle,
  ShoppingCart,
  CreditCard,
  Warehouse,
  Truck,
  UserCheck,
  Bell,
  Search,
  MessageCircle,
  Video,
  UploadCloud,
  BarChart3,
  Compass,
  Mail,
  Calendar,
  ShieldAlert,
  Headphones,
  MapPin,
  Receipt,
  KeyRound,
} from 'lucide-react';
import {
  SiPostgresql,
  SiMysql,
  SiMongodb,
  SiRedis,
  SiApachekafka,
  SiRabbitmq,
  SiNginx,
  SiDocker,
  SiKubernetes,
} from 'react-icons/si';
import type { ArchitectureNodeData, ComponentCategory } from '../../types/architecture';
import { COMPONENT_CATALOG } from '../../data/componentLibrary';

const categoryConfig: Record<
  ComponentCategory, 
  { 
    border: string; 
    bg: string; 
    iconColor: string; 
    defaultIcon: React.ComponentType<{ size?: number; className?: string }>; 
    badge: string 
  }
> = {
  client: {
    border: 'border-emerald-500/40 hover:border-emerald-400',
    bg: 'bg-emerald-950/20',
    iconColor: 'text-emerald-400',
    defaultIcon: Monitor,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  gateway: {
    border: 'border-cyan-500/40 hover:border-cyan-400',
    bg: 'bg-cyan-950/20',
    iconColor: 'text-cyan-400',
    defaultIcon: Network,
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  service: {
    border: 'border-violet-500/40 hover:border-violet-400',
    bg: 'bg-violet-950/20',
    iconColor: 'text-violet-400',
    defaultIcon: Server,
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  database: {
    border: 'border-blue-500/40 hover:border-blue-400',
    bg: 'bg-blue-950/20',
    iconColor: 'text-blue-400',
    defaultIcon: Database,
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  cache: {
    border: 'border-fuchsia-500/40 hover:border-fuchsia-400',
    bg: 'bg-fuchsia-950/20',
    iconColor: 'text-fuchsia-400',
    defaultIcon: Zap,
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  },
  queue: {
    border: 'border-amber-500/40 hover:border-amber-400',
    bg: 'bg-amber-950/20',
    iconColor: 'text-amber-400',
    defaultIcon: Radio,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export const ArchitectureNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ArchitectureNodeData;
  const config = categoryConfig[nodeData.category] || categoryConfig.service;

  // 1. Exact catalog match by ID or exact label
  let catalogItem = COMPONENT_CATALOG.find(
    (c) => c.id === nodeData.catalogId || c.name.toLowerCase() === (nodeData.label || '').toLowerCase()
  );

  // 2. Intelligent fuzzy / tag matching if not exact match
  if (!catalogItem && nodeData.label) {
    const cleanLabel = nodeData.label.toLowerCase();
    catalogItem = COMPONENT_CATALOG.find((c) => {
      const cName = c.name.toLowerCase();
      return (
        cleanLabel.includes(cName) ||
        cName.includes(cleanLabel) ||
        c.tags.some((t) => cleanLabel.includes(t.toLowerCase()) || t.toLowerCase().includes(cleanLabel))
      );
    });
  }

  // 3. Fallback smart icon resolver for custom nodes (Order, Payment, Inventory, Shipping, DBs, etc.)
  let Icon = catalogItem?.icon;
  if (!Icon) {
    const l = (nodeData.label || '').toLowerCase();
    const t = (nodeData.technology || '').toLowerCase();
    const str = `${l} ${t}`;

    if (str.includes('order') || str.includes('cart') || str.includes('checkout')) Icon = ShoppingCart;
    else if (str.includes('pay') || str.includes('stripe')) Icon = CreditCard;
    else if (str.includes('bill') || str.includes('invoice') || str.includes('receipt')) Icon = Receipt;
    else if (str.includes('inventory') || str.includes('stock') || str.includes('warehouse')) Icon = Warehouse;
    else if (str.includes('ship') || str.includes('deliver') || str.includes('courier') || str.includes('truck')) Icon = Truck;
    else if (str.includes('user') || str.includes('auth') || str.includes('account') || str.includes('identity')) Icon = UserCheck;
    else if (str.includes('notify') || str.includes('notification') || str.includes('alert')) Icon = Bell;
    else if (str.includes('search') || str.includes('elastic') || str.includes('opensearch')) Icon = Search;
    else if (str.includes('chat') || str.includes('message') || str.includes('socket')) Icon = MessageCircle;
    else if (str.includes('video') || str.includes('stream') || str.includes('media')) Icon = Video;
    else if (str.includes('upload') || str.includes('file') || str.includes('s3') || str.includes('blob')) Icon = UploadCloud;
    else if (str.includes('analytic') || str.includes('metric') || str.includes('telemetry')) Icon = BarChart3;
    else if (str.includes('recommend') || str.includes('feed') || str.includes('ranking')) Icon = Compass;
    else if (str.includes('mail') || str.includes('email') || str.includes('smtp')) Icon = Mail;
    else if (str.includes('schedule') || str.includes('cron') || str.includes('timer')) Icon = Calendar;
    else if (str.includes('fraud') || str.includes('risk')) Icon = ShieldAlert;
    else if (str.includes('support') || str.includes('ticket') || str.includes('help')) Icon = Headphones;
    else if (str.includes('geo') || str.includes('map') || str.includes('location')) Icon = MapPin;
    else if (str.includes('secret') || str.includes('kms') || str.includes('vault')) Icon = KeyRound;
    else if (str.includes('postgres') || str.includes('psql')) Icon = SiPostgresql;
    else if (str.includes('mysql')) Icon = SiMysql;
    else if (str.includes('redis')) Icon = SiRedis;
    else if (str.includes('mongo')) Icon = SiMongodb;
    else if (str.includes('kafka')) Icon = SiApachekafka;
    else if (str.includes('rabbit')) Icon = SiRabbitmq;
    else if (str.includes('nginx')) Icon = SiNginx;
    else if (str.includes('docker')) Icon = SiDocker;
    else if (str.includes('kube') || str.includes('k8s')) Icon = SiKubernetes;
    else Icon = config.defaultIcon;
  }

  const brandColor = nodeData.brandColor || catalogItem?.brandColor;

  return (
    <div
      className={`relative min-w-[210px] rounded-2xl border backdrop-blur-xl transition-all duration-200 shadow-2xl p-4 ${
        config.border
      } ${config.bg} bg-slate-900/90 ${
        selected ? 'ring-2 ring-indigo-400 shadow-indigo-500/30' : ''
      }`}
    >
      <NodeResizer
        color="#6366f1"
        isVisible={selected}
        minWidth={200}
        minHeight={85}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
      />

      {/* 4 Port Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950"
      />

      <div className="flex items-center gap-3">
        <div 
          className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0"
          style={{ color: brandColor || undefined }}
        >
          <Icon size={22} className={brandColor ? '' : config.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-100 truncate">
            {nodeData.label}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <span className="truncate">{nodeData.technology || nodeData.category}</span>
            {nodeData.replicas && nodeData.replicas > 1 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded shrink-0">
                x{nodeData.replicas}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta tags / warning indicators */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className={`px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono text-[10px] ${config.badge}`}>
          {nodeData.category}
        </span>
        {nodeData.category === 'database' && (!nodeData.replicas || nodeData.replicas === 1) && (
          <span className="flex items-center gap-1 text-amber-400 text-[10px]" title="Single Instance (Potential SPOF)">
            <AlertTriangle size={12} />
            SPOF Risk
          </span>
        )}
      </div>
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';
