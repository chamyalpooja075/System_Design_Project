import React, { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { ChevronDown, Check } from 'lucide-react';
import type { ProtocolType } from '../../types/architecture';
import {
  ALL_PROTOCOLS,
  getProtocolConfig,
} from '../../data/protocolCatalog';

export const ProtocolEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const protocol = (data?.protocol as ProtocolType) || 'HTTPS';
  const isAsync = (data?.isAsync as boolean) ?? false;

  const protoCfg = getProtocolConfig(protocol, isAsync);
  const strokeColor = selected ? '#38bdf8' : protoCfg.color;
  const badgeStyle = selected
    ? 'bg-sky-950 text-sky-200 border-sky-400 ring-2 ring-sky-400/50'
    : `${protoCfg.badgeBg} ${protoCfg.badgeBorder} ${protoCfg.badgeText} hover:brightness-125`;

  const onUpdateProtocol = (data as any)?.onUpdateProtocol;

  const handleSelectProtocol = (e: React.MouseEvent, newProto: string) => {
    e.stopPropagation();
    if (onUpdateProtocol) {
      const targetCfg = getProtocolConfig(newProto);
      onUpdateProtocol(newProto, targetCfg.defaultAsync);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
          strokeDasharray: isAsync ? '5 5' : undefined,
          filter: selected ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan z-40"
        >
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className={`group flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-md border shadow-lg backdrop-blur-md transition-all cursor-pointer ${badgeStyle}`}
              title={`${protocol}: ${protoCfg.purpose} (Click to change)`}
            >
              <span>{protocol}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 max-h-72 flex flex-col bg-[#0b0f19]/98 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Select Protocol</span>
                  <span className="text-[9px] text-cyan-400 font-mono font-normal">25 protocols</span>
                </div>
                <div className="overflow-y-auto space-y-0.5 flex-1 max-h-56 pr-1">
                  {ALL_PROTOCOLS.map((p) => {
                    const isCur = p.id.toLowerCase() === protocol.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => handleSelectProtocol(e, p.id)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-left transition-colors cursor-pointer group ${
                          isCur
                            ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                        title={p.purpose}
                      >
                        <div className="flex flex-col min-w-0 pr-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold group-hover:text-cyan-300">
                              {p.label}
                            </span>
                            {p.defaultAsync && (
                              <span className="text-[8px] px-1 rounded bg-amber-950 text-amber-400 border border-amber-600/30">
                                Async
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate">
                            {p.purpose}
                          </span>
                        </div>
                        {isCur && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
