import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Server, 
  Database, 
  Zap, 
  Radio,
  Network,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronsRight,
  Layers,
  Wrench,
  PlusCircle,
} from 'lucide-react';
import type { EvaluatedMetrics, ArchitectureProblem } from '../../services/metricsEngine';

interface MetricsInspectorProps {
  metrics: EvaluatedMetrics;
  onRunCritique: () => void;
  isAnalyzing?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onQuickFix?: (problem: ArchitectureProblem) => void;
  onFocusNode?: (nodeId: string) => void;
}

export const MetricsInspector: React.FC<MetricsInspectorProps> = ({
  metrics,
  onRunCritique,
  isAnalyzing = false,
  isOpen = false,
  onClose,
  onQuickFix,
  onFocusNode,
}) => {
  const [showRoster, setShowRoster] = useState(false);
  const [showBestPractices, setShowBestPractices] = useState(true);

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-950/40';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/40';
  };

  const getCategoryColor = (category: string) => {
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

  const criticalProblems = (metrics.problems || []).filter((p) => p.severity === 'critical');
  const warningProblems = (metrics.problems || []).filter((p) => p.severity !== 'critical');

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`${
          isOpen
            ? 'flex fixed lg:relative inset-y-0 right-0 z-50 lg:z-10 shadow-2xl animate-in slide-in-from-right duration-200'
            : 'hidden'
        } w-full max-w-[360px] sm:w-[360px] 2xl:w-[400px] border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl flex-col h-full select-none shrink-0 relative transition-all`}
      >
        {/* Quick Collapse Tab Handle on Left Border (Desktop) */}
        {onClose && (
          <button
            onClick={onClose}
            className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-l-md items-center justify-center text-slate-400 hover:text-white shadow-xl cursor-pointer transition-all group"
            title="Collapse Metrics Panel (>>)"
            aria-label="Collapse Metrics Panel"
          >
            <ChevronsRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Activity size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100 truncate">Metrics Engine</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Deterministic Diagnostics & Fixes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-xs font-mono border px-2.5 py-0.5 rounded-full font-semibold transition-colors ${getScoreBadge(metrics.redundancyScore)}`}>
              Score: {metrics.redundancyScore}/100
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-all cursor-pointer flex items-center gap-1 group"
                title="Collapse Metrics Panel (>>)"
                aria-label="Collapse Metrics Panel"
              >
                <ChevronsRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {/* 1. Score Progress Bar & Summary */}
          <div className="p-3 rounded-xl border border-slate-800/90 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Architecture Health</span>
              <span className="font-mono text-xs font-bold text-slate-200">
                {metrics.redundancyScore >= 80 ? '🟢 Production Ready' : metrics.redundancyScore >= 60 ? '🟡 Moderate Risk' : '🔴 Critical Issues'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
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
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>SPOFs: <strong className={metrics.spof.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>{metrics.spof.length}</strong></span>
              <span>Avg Fan-Out: <strong className="text-slate-200 font-mono">{metrics.fanOut}x</strong></span>
              <span>Cycles: <strong className={(metrics.cycles?.length ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}>{metrics.cycles?.length ?? 0}</strong></span>
            </div>
          </div>

          {/* 2. Core Statistics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 text-violet-400 mb-1">
                <Server size={14} />
                <span className="text-[11px] text-slate-400">Services</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{metrics.services}</div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Database size={14} />
                <span className="text-[11px] text-slate-400">Databases</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{metrics.databases}</div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 text-fuchsia-400 mb-1">
                <Zap size={14} />
                <span className="text-[11px] text-slate-400">Caches</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{metrics.caches}</div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Radio size={14} />
                <span className="text-[11px] text-slate-400">Queues</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{metrics.queues}</div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 col-span-2">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Network size={14} />
                <span className="text-[11px] text-slate-400">Gateways & Ingress</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{metrics.loadBalancers ?? 0}</div>
            </div>
          </div>

          {/* 3. Actionable Problems & Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                <span>Issues & Prescriptions</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                (metrics.problems?.length ?? 0) === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {metrics.problems?.length ?? 0} ACTIONABLE
              </span>
            </div>

            {(!metrics.problems || metrics.problems.length === 0) ? (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-emerald-200">All checks passed!</div>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Zero SPOFs, no circular deadlocks, and high availability redundancy criteria satisfied.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Critical Issues */}
                {criticalProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-2.5 shadow-lg shadow-rose-950/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShieldAlert size={15} className="text-rose-400 shrink-0" />
                        <h4 className="text-xs font-bold text-rose-200 truncate">{prob.title}</h4>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                        Critical
                      </span>
                    </div>

                    {/* What is the problem */}
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Problem</div>
                      <p className="leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-rose-200/90 font-sans">
                        {prob.problem}
                      </p>
                    </div>

                    {/* Why does it matter (Risk/Impact) */}
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-amber-400/90 font-medium text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={11} />
                        <span>Production Impact & Risk</span>
                      </div>
                      <p className="leading-relaxed bg-amber-950/20 p-2 rounded-lg border border-amber-500/30 text-amber-200/90 font-sans">
                        {prob.impact}
                      </p>
                    </div>

                    {/* How to fix it */}
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-emerald-400/90 font-medium text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Wrench size={11} />
                        <span>How to Fix</span>
                      </div>
                      <p className="leading-relaxed bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30 text-emerald-200/90 font-sans">
                        {prob.solution}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      {prob.quickFix && onQuickFix && (
                        <button
                          onClick={() => onQuickFix(prob)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-[11px] font-semibold transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap size={13} className="fill-current" />
                          <span>{prob.quickFix.label}</span>
                        </button>
                      )}
                      {prob.nodeId && onFocusNode && (
                        <button
                          onClick={() => onFocusNode(prob.nodeId!)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white text-[11px] font-medium transition-all border border-slate-700 flex items-center gap-1 cursor-pointer"
                          title="Locate component on canvas"
                        >
                          <Crosshair size={13} />
                          <span>Locate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Warnings / Architectural Advice */}
                {warningProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/15 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                        <h4 className="text-xs font-bold text-amber-200 truncate">{prob.title}</h4>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        Warning
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Problem</div>
                      <p className="leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-amber-200/90 font-sans">
                        {prob.problem}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-amber-400/90 font-medium text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={11} />
                        <span>Production Impact</span>
                      </div>
                      <p className="leading-relaxed bg-amber-950/20 p-2 rounded-lg border border-amber-500/30 text-amber-200/90 font-sans">
                        {prob.impact}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-emerald-400/90 font-medium text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Wrench size={11} />
                        <span>How to Fix</span>
                      </div>
                      <p className="leading-relaxed bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30 text-emerald-200/90 font-sans">
                        {prob.solution}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      {prob.quickFix && onQuickFix && (
                        <button
                          onClick={() => onQuickFix(prob)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-[11px] font-semibold transition-all shadow-md shadow-indigo-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle size={13} />
                          <span>{prob.quickFix.label}</span>
                        </button>
                      )}
                      {prob.nodeId && onFocusNode && (
                        <button
                          onClick={() => onFocusNode(prob.nodeId!)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white text-[11px] font-medium transition-all border border-slate-700 flex items-center gap-1 cursor-pointer"
                          title="Locate component on canvas"
                        >
                          <Crosshair size={13} />
                          <span>Locate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Component Inventory (What we installed & Why) */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => setShowRoster(!showRoster)}
              className="w-full p-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span>Components Installed ({metrics.componentDetails?.length ?? 0})</span>
              </div>
              {showRoster ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showRoster && (
              <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80">
                {(!metrics.componentDetails || metrics.componentDetails.length === 0) ? (
                  <p className="text-[11px] text-slate-500 p-2">No components on canvas.</p>
                ) : (
                  metrics.componentDetails.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => onFocusNode && onFocusNode(comp.id)}
                      className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-xs text-slate-200 truncate">{comp.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${getCategoryColor(comp.category)}`}>
                            {comp.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                          {comp.replicas}x {comp.replicas > 1 ? 'nodes' : 'node'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                        {comp.purpose}
                      </p>
                      <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500 pt-0.5">
                        <span>Callers: {comp.inDegree}</span>
                        <span>Dependencies: {comp.outDegree}</span>
                        {comp.isSpof && <span className="text-rose-400 font-semibold">⚠️ Single Point of Failure</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 5. Verified Best Practices Checklist */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => setShowBestPractices(!showBestPractices)}
              className="w-full p-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Verified Best Practices ({metrics.bestPractices?.length ?? 0})</span>
              </div>
              {showBestPractices ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showBestPractices && (
              <div className="p-3 pt-0 space-y-1.5 border-t border-slate-800/80">
                {(!metrics.bestPractices || metrics.bestPractices.length === 0) ? (
                  <p className="text-[11px] text-slate-500 p-2">Add components and replicas to verify best practices.</p>
                ) : (
                  metrics.bestPractices.map((bp) => (
                    <div
                      key={bp.id}
                      className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-950/15 flex items-start gap-2 text-xs"
                    >
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-emerald-200 text-[11px]">{bp.title}</div>
                        <p className="text-[10px] text-emerald-400/80 leading-relaxed mt-0.5">
                          {bp.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions: Run Critique */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-950/50 shrink-0">
          <button
            onClick={onRunCritique}
            disabled={isAnalyzing}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={15} />
            <span>{isAnalyzing ? 'Analyzing Graph...' : 'Run AI Architecture Critique'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
