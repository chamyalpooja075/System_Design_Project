import React from 'react';
import { X, Copy, Trash2, Layers, Cpu, Tag, Info } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { ArchitectureNodeData } from '../../types/architecture';

interface NodeConfigDrawerProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateNode: (id: string, updatedData: Partial<ArchitectureNodeData>) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (node: Node) => void;
}

export const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  selectedNode,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
}) => {
  if (!selectedNode) return null;

  const data = selectedNode.data as unknown as ArchitectureNodeData;
  const replicas = typeof data.replicas === 'number' ? data.replicas : 1;

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNode(selectedNode.id, { label: e.target.value });
  };

  const handleTechChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNode(selectedNode.id, { technology: e.target.value });
  };

  const handleReplicasChange = (delta: number) => {
    const nextReplicas = Math.max(1, replicas + delta);
    onUpdateNode(selectedNode.id, { replicas: nextReplicas });
  };

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[340px] sm:w-80 2xl:w-96 bg-[#0c101a]/95 backdrop-blur-2xl border-l border-slate-800/90 shadow-2xl flex flex-col z-40 animate-in fade-in slide-in-from-right-2 duration-150 select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Node Inspector</h2>
            <p className="text-[11px] text-slate-400 font-mono capitalize">{data.category}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form Controls */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Architectural Classification (Authoritative from Component Library) */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={13} className="text-slate-400" />
              <span>Architectural Classification</span>
            </span>
          </label>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                  data.category === 'client'
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                    : data.category === 'gateway'
                    ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30'
                    : data.category === 'service'
                    ? 'border-violet-500/40 text-violet-300 bg-violet-950/30'
                    : data.category === 'database'
                    ? 'border-blue-500/40 text-blue-300 bg-blue-950/30'
                    : data.category === 'cache'
                    ? 'border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-950/30'
                    : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                }`}
              >
                {data.category}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">
                  {data.category === 'client' && 'Client Application'}
                  {data.category === 'gateway' && 'API Gateway / Ingress'}
                  {data.category === 'service' && 'Backend Microservice'}
                  {data.category === 'database' && 'Persistent Database'}
                  {data.category === 'cache' && 'In-Memory Cache Tier'}
                  {data.category === 'queue' && 'Message Queue / Stream'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {data.category === 'client' && 'Traffic origin (browser, mobile, frontend)'}
                  {data.category === 'gateway' && 'Reverse proxy, routing & rate limiting'}
                  {data.category === 'service' && 'Domain business logic & compute worker'}
                  {data.category === 'database' && 'ACID storage & relational/NoSQL persistence'}
                  {data.category === 'cache' && 'Sub-millisecond high-speed key-value tier'}
                  {data.category === 'queue' && 'Asynchronous message broker & event bus'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Component Label */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Tag size={13} className="text-slate-400" />
            <span>Component Name</span>
          </label>
          <input
            type="text"
            value={data.label || ''}
            onChange={handleLabelChange}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Technology / Framework */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Cpu size={13} className="text-slate-400" />
            <span>Technology / Engine</span>
          </label>
          <input
            type="text"
            value={data.technology || ''}
            onChange={handleTechChange}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Instance Replicas / Redundancy */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={13} className="text-slate-400" />
              <span>Instances / Replicas</span>
            </span>
            <span className={`text-[10px] font-mono ${replicas === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {replicas === 1 ? '1 Instance (SPOF Risk)' : `${replicas} Instances (HA Clustered)`}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleReplicasChange(-1)}
              disabled={replicas <= 1}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              -
            </button>
            <div className="flex-1 py-2 text-center bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-xs font-bold text-white">
              x{replicas}
            </div>
            <button
              type="button"
              onClick={() => handleReplicasChange(1)}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Dynamic HA / SPOF Status Callout */}
          {replicas === 1 ? (
            <div className="mt-2.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-[11px] flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                {data.category === 'database' && 'Unreplicated primary database. Scale replicas to ≥ 2 for zero data-loss failover.'}
                {data.category === 'service' && 'Single service instance. Scale replicas to ≥ 2 for high-availability load balancing.'}
                {data.category === 'gateway' && 'Single ingress gateway. Scale replicas to ≥ 2 for multi-AZ redundant routing.'}
                {(data.category === 'cache' || data.category === 'queue' || data.category === 'client') && 'Single instance node. Consider failover standby if on the critical traffic path.'}
              </span>
            </div>
          ) : (
            <div className="mt-2.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-[11px] flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>High Availability configured. Standby replicas eliminate single-point-of-failure vulnerabilities.</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        <button
          onClick={() => onDuplicateNode(selectedNode)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Copy size={14} />
          <span>Duplicate Component</span>
        </button>

        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Delete Component</span>
        </button>
      </div>
    </aside>
  );
};
