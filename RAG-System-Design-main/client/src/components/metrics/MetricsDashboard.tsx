import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  Zap,
  Radio,
  Network,
  Monitor,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Crosshair,
  Wrench,
  Info,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { EvaluatedMetrics, ArchitectureProblem } from '../../services/metricsEngine';

interface MetricsDashboardProps {
  metrics: EvaluatedMetrics;
  nodes: Node[];
  edges: Edge[];
  onBackToCanvas: () => void;
  onRunAiAssistant: () => void;
  onQuickFix?: (problem: ArchitectureProblem) => void;
  onFocusNode?: (nodeId: string) => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  nodes,
  edges,
  onBackToCanvas,
  onRunAiAssistant,
  onQuickFix,
  onFocusNode,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');

  const getScoreHealth = (score: number) => {
    if (score >= 85) return { status: 'High Resilience', color: 'text-emerald-400', badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
    if (score >= 60) return { status: 'Moderate Risk', color: 'text-amber-400', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
    return { status: 'Critical Vulnerabilities', color: 'text-rose-400', badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };
  };

  const health = getScoreHealth(metrics.redundancyScore);

  // Classify architecture nodes
  const archNodes = nodes.filter((n) => !(n.data as any)?.isAnnotation && n.type === 'architectureNode');
  const clientCount = archNodes.filter((n) => (n.data as any)?.category === 'client').length;
  const gatewayCount = metrics.loadBalancers || archNodes.filter((n) => (n.data as any)?.category === 'gateway').length;

  const filteredProblems = (metrics.problems || []).filter((p) => {
    if (filterSeverity === 'all') return true;
    return p.severity === filterSeverity;
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'client': return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30';
      case 'gateway': return 'text-cyan-400 bg-cyan-950/30 border-cyan-500/30';
      case 'service': return 'text-violet-400 bg-violet-950/30 border-violet-500/30';
      case 'database': return 'text-blue-400 bg-blue-950/30 border-blue-500/30';
      case 'cache': return 'text-fuchsia-400 bg-fuchsia-950/30 border-fuchsia-500/30';
      case 'queue': return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      default: return 'text-slate-400 bg-slate-800/40 border-slate-700/30';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#070a12] text-slate-100 p-3.5 sm:p-6 md:p-8 2xl:p-12 select-none">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 sm:pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={onBackToCanvas}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Return to Canvas"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Activity size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="truncate">Deterministic Architecture Health & Prescriptions</span>
                  <span className="text-[10px] sm:text-xs font-mono font-normal px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Live Diagnostics
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                  Real-time algorithmic graph traversal: {archNodes.length} components, {edges.length} connections, 0ms compute time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onBackToCanvas}
              className="px-3 sm:px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2"
            >
              <span>Back to Canvas</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onRunAiAssistant}
              className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-medium shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2"
            >
              <Sparkles size={14} />
              <span>Run AI Critique</span>
            </button>
          </div>
        </div>

        {/* Hero Score & Health Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Main Redundancy Score Card */}
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl flex flex-col justify-between shadow-2xl relative overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Reliability Score
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black font-mono tracking-tight text-white">
                    {metrics.redundancyScore}
                  </span>
                  <span className="text-sm font-mono text-slate-500">/ 100</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${health.badge}`}>
                {health.status}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    metrics.redundancyScore >= 80
                      ? 'bg-emerald-500'
                      : metrics.redundancyScore >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${metrics.redundancyScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Calculated deterministically via SPOFs, cyclic graphs, and high-availability failure modes.
              </p>
            </div>
          </div>

          {/* SPOF Summary Card */}
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl flex flex-col justify-between shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Single Points of Failure
                </span>
                <div className="text-3xl font-bold font-mono text-white mt-2">
                  {metrics.spof.length}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${metrics.spof.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {metrics.spof.length > 0 ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80">
              {metrics.spof.length > 0 ? (
                <p className="text-xs text-rose-300 font-medium">
                  {metrics.spof.length} active SPOF{metrics.spof.length > 1 ? 's' : ''} detected. Components lack standby failover replicas or multi-zone nodes.
                </p>
              ) : (
                <p className="text-xs text-emerald-300 font-medium">
                  Zero SPOFs detected! All primary databases, gateways, and services have failover redundancy.
                </p>
              )}
            </div>
          </div>

          {/* Topology Flow Ratio Card */}
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl flex flex-col justify-between shadow-2xl sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Avg Service Fan-Out
                </span>
                <div className="text-3xl font-bold font-mono text-white mt-2">
                  {metrics.fanOut.toFixed(1)}x
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <RefreshCw size={20} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <p className="text-xs text-slate-400">
                Average downstream connections per service. {metrics.fanOut > 4 ? 'High fan-out: consider caching or event decoupling.' : 'Healthy service fan-out.'}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Category Breakdown Cards */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <span>Component Classification & Counts</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Monitor size={15} />
                <span className="text-xs font-medium">Clients</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{clientCount}</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/15">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Network size={15} />
                <span className="text-xs font-medium">Gateways</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{gatewayCount}</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-violet-500/30 bg-violet-950/15">
              <div className="flex items-center gap-2 text-violet-400 mb-1">
                <Server size={15} />
                <span className="text-xs font-medium">Services</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{metrics.services}</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-blue-500/30 bg-blue-950/15">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Database size={15} />
                <span className="text-xs font-medium">Databases</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{metrics.databases}</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/15">
              <div className="flex items-center gap-2 text-fuchsia-400 mb-1">
                <Zap size={15} />
                <span className="text-xs font-medium">Caches</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{metrics.caches}</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-950/15">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Radio size={15} />
                <span className="text-xs font-medium">Queues</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{metrics.queues}</div>
            </div>
          </div>
        </div>

        {/* ACTIONABLE PROBLEMS & RESOLUTIONS SECTION */}
        <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <span>Actionable Architectural Problems & Production Prescriptions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic issues ranked by production severity with concrete remedies and 1-click canvas resolution.
              </p>
            </div>

            {/* Severity Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSeverity === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({metrics.problems?.length ?? 0})
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSeverity === 'critical' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                Critical ({metrics.problems?.filter((p) => p.severity === 'critical').length ?? 0})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSeverity === 'warning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Warnings ({metrics.problems?.filter((p) => p.severity !== 'critical').length ?? 0})
              </button>
            </div>
          </div>

          {filteredProblems.length === 0 ? (
            <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-sm text-emerald-200">Zero issues matching filter!</div>
                <p className="text-emerald-400/80 mt-0.5">
                  Your architecture graph satisfies all high-availability, zero-SPOF, and decoupling guidelines.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((prob) => {
                const isCrit = prob.severity === 'critical';
                return (
                  <div
                    key={prob.id}
                    className={`p-4 sm:p-5 rounded-xl border ${
                      isCrit
                        ? 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20'
                        : 'border-amber-500/40 bg-amber-950/15'
                    } space-y-4`}
                  >
                    {/* Problem Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {isCrit ? (
                          <ShieldAlert size={18} className="text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                        )}
                        <h3 className="font-bold text-sm text-white truncate">{prob.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {prob.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {prob.category}
                        </span>
                      </div>
                    </div>

                    {/* 3-Part Production Drilldown: Problem / Impact / Solution */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* 1. What is the problem */}
                      <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Info size={12} className="text-slate-400" />
                          <span>Identified Problem</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed font-sans mt-1">
                          {prob.problem}
                        </p>
                      </div>

                      {/* 2. Why does it matter (Risk / Impact) */}
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-rose-400" />
                          <span>Production Impact & Risk</span>
                        </div>
                        <p className="text-rose-200/90 leading-relaxed font-sans mt-1">
                          {prob.impact}
                        </p>
                      </div>

                      {/* 3. How to fix it (Solution) */}
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Wrench size={12} className="text-emerald-400" />
                          <span>How to Resolve</span>
                        </div>
                        <p className="text-emerald-200/90 leading-relaxed font-sans mt-1">
                          {prob.solution}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Action Footer */}
                    <div className="pt-1 flex items-center justify-end gap-2.5 flex-wrap">
                      {prob.nodeId && onFocusNode && (
                        <button
                          onClick={() => {
                            onFocusNode(prob.nodeId!);
                            onBackToCanvas();
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Crosshair size={14} />
                          <span>Locate on Canvas</span>
                        </button>
                      )}
                      {prob.quickFix && onQuickFix && (
                        <button
                          onClick={() => {
                            onQuickFix(prob);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Zap size={14} className="fill-current" />
                          <span>{prob.quickFix.label}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COMPONENT INVENTORY & ARCHITECTURAL ROSTER (What we installed & Why) */}
        <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-cyan-400" />
                <span>Component Inventory & Architectural Purpose</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full breakdown of all {metrics.componentDetails?.length ?? 0} active components: why they exist and their topological configuration.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Replicas</th>
                  <th className="py-2.5 px-3">Architectural Purpose</th>
                  <th className="py-2.5 px-3">Topology (In / Out)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(!metrics.componentDetails || metrics.componentDetails.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No architectural components on canvas yet.
                    </td>
                  </tr>
                ) : (
                  metrics.componentDetails.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.brandColor || '#818cf8' }} />
                          <span>{comp.label}</span>
                          {comp.isSpof && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                              SPOF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryBadgeClass(comp.category)}`}>
                          {comp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`font-mono font-bold ${comp.replicas > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {comp.replicas}x
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">
                          {comp.replicas > 1 ? 'instances' : 'single'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs xl:max-w-md">
                        <p className="line-clamp-2 leading-relaxed text-[11px]">
                          {comp.purpose}
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        <span className="text-cyan-400">{comp.inDegree} in</span>
                        <span className="mx-1.5 text-slate-600">/</span>
                        <span className="text-violet-400">{comp.outDegree} out</span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (onFocusNode) onFocusNode(comp.id);
                            onBackToCanvas();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors border border-slate-700 cursor-pointer"
                        >
                          Focus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DIRECTED ACYCLIC GRAPH & VERIFIED BEST PRACTICES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Cycle Analysis (DFS) */}
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl shadow-2xl space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-400" />
              <span>Circular Dependency Graph Analysis (DFS)</span>
            </h2>

            {metrics.cycles && metrics.cycles.length > 0 ? (
              <div className="space-y-2">
                {metrics.cycles.map((cycle, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs">
                    <div className="font-semibold text-rose-200">Cycle Loop #{idx + 1}</div>
                    <div className="font-mono text-[11px] mt-1 text-rose-300">
                      {cycle.join(' → ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-200">Directed Acyclic Graph (DAG) Verified</div>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    Zero circular deadlocks detected. All service requests flow in an orderly acyclic hierarchy.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verified Best Practices Checklist */}
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl shadow-2xl space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Verified Architectural Best Practices</span>
            </h2>

            {(!metrics.bestPractices || metrics.bestPractices.length === 0) ? (
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-400">
                Add caches, message queues, and standby replicas to unlock architectural best practice validations.
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.bestPractices.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/15 text-xs text-slate-300 flex items-start gap-2.5"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-200 text-xs">{bp.title}</span>
                      <p className="text-[11px] text-emerald-400/80 mt-0.5 leading-relaxed">
                        {bp.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
