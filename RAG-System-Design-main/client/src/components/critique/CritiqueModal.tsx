import React, { useEffect, useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert, 
  Lightbulb,
  Zap,
  Radio,
  Check,
  Loader2,
  BookOpen,
  FileText,
  ShieldCheck,
  Cpu,
  Copy,
  Wrench,
  Crosshair,
  Info,
} from 'lucide-react';
import type { CritiqueResponse } from '../../services/api';
import { 
  subscribeToStatusUpdates, 
  subscribeToCritiqueComplete, 
  type StatusUpdatePayload 
} from '../../services/socket';

interface CritiqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CritiqueResponse | null;
  isLoading: boolean;
  jobId?: string | null;
  isAsyncQueue?: boolean;
  onAsyncComplete?: (data: CritiqueResponse) => void;
  onQuickFix?: (problem: any) => void;
  onFocusNode?: (nodeId: string) => void;
}

const STEP_ORDER = ['QUEUED', 'TOPOLOGY', 'RULES', 'RAG', 'SYNTHESIS'];

export const CritiqueModal: React.FC<CritiqueModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
  jobId,
  isAsyncQueue,
  onAsyncComplete,
  onQuickFix,
  onFocusNode,
}) => {
  const [streamUpdates, setStreamUpdates] = useState<StatusUpdatePayload[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'synthesis' | 'standards'>('overview');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [copied, setCopied] = useState(false);
  const [resolvedViolationIds, setResolvedViolationIds] = useState<Set<string>>(new Set());

  // Subscribe to live status updates and async completion over WebSocket
  useEffect(() => {
    if (!isOpen) {
      setStreamUpdates([]);
      setActiveTab('overview');
      setCopied(false);
      setResolvedViolationIds(new Set());
      return;
    }

    const unsubStatus = subscribeToStatusUpdates((payload) => {
      setStreamUpdates((prev) => {
        const existingIdx = prev.findIndex((p) => p.step === payload.step);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = payload;
          return updated;
        }
        return [...prev, payload];
      });
    });

    const unsubComplete = subscribeToCritiqueComplete((completePayload) => {
      if (onAsyncComplete && completePayload.result) {
        onAsyncComplete(completePayload.result);
      }
    });

    return () => {
      unsubStatus();
      unsubComplete();
    };
  }, [isOpen, onAsyncComplete]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (data?.rawCritiqueText) {
      navigator.clipboard.writeText(data.rawCritiqueText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const violations = data?.ruleViolations || [];
  const filteredViolations = violations.filter((v) => {
    if (filterSeverity === 'ALL') return true;
    return v.severity === filterSeverity;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 md:p-6 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-4xl 2xl:max-w-5xl max-h-[92vh] sm:max-h-[90vh] rounded-2xl border border-slate-800 bg-[#0d121f] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <Sparkles size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">AI Architecture Critique</h2>
                {isAsyncQueue && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1">
                    <Cpu size={11} className="text-purple-400" />
                    Redpanda Queue {jobId ? `(${jobId.slice(0, 8)}...)` : ''}
                  </span>
                )}
                {data && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                    data.source === 'ai' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {data.source === 'ai' ? 'LLM + RAG Grounded' : 'Deterministic Fallback'}
                  </span>
                )}
                {data?.cached && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-cyan-500/20 text-cyan-300 border-cyan-500/30 flex items-center gap-1">
                    <Zap size={11} className="fill-cyan-400" />
                    Redis Cache Hit (&lt;20ms)
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                Principal-level architectural audit grounded in Redpanda queue, pgvector RAG & LLM synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0 ml-2"
            title="Close Critique Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Bar (Visible once data is loaded) */}
        {!isLoading && data && (
          <div className="px-4 sm:px-6 pt-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText size={14} />
                <span>Executive Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('findings')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'findings'
                    ? 'border-rose-500 text-rose-300 bg-rose-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert size={14} />
                <span>Actionable Findings ({violations.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('synthesis')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'synthesis'
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                <span>Full Technical Report</span>
              </button>
              <button
                onClick={() => setActiveTab('standards')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'standards'
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen size={14} />
                <span>RAG Standards ({data.citedPatterns?.length ?? 0})</span>
              </button>
            </div>

            {data.rawCritiqueText && (
              <button
                onClick={handleCopyReport}
                className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 mb-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer shrink-0"
                title="Copy Full Report to Clipboard"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                  <Radio size={14} className="animate-pulse text-indigo-400" />
                  <span>
                    {isAsyncQueue ? 'Asynchronous Worker Processing (/ws/analysis)' : 'Streaming Analysis via WebSocket (/ws/analysis)'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">Evaluating Architecture Resilience</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Offloaded to background queue, traversing topology, running deterministic rule checks, retrieving grounded RAG patterns, and synthesizing deep AI critique.
                </p>
              </div>

              {/* Real-time Status Stepper */}
              <div className="max-w-md mx-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 font-mono text-xs shadow-xl">
                {STEP_ORDER.map((stepKey, idx) => {
                  const update = streamUpdates.find((u) => u.step === stepKey);
                  const isDone = !!update;
                  const isCurrent = !isDone && (idx === 0 || streamUpdates.some((u) => u.step === STEP_ORDER[idx - 1]));

                  let defaultLabel = 'Offloaded to Redpanda queue. Awaiting worker pickup...';
                  if (stepKey === 'TOPOLOGY') defaultLabel = 'Checking topology & single points of failure...';
                  if (stepKey === 'RULES') defaultLabel = 'Evaluating architecture rule catalog & constraints...';
                  if (stepKey === 'RAG') defaultLabel = 'Retrieving architectural patterns from Knowledge Base...';
                  if (stepKey === 'SYNTHESIS') defaultLabel = 'Synthesizing expert architectural critique...';

                  return (
                    <div
                      key={stepKey}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                        isDone
                          ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/20'
                          : isCurrent
                          ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {isDone ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Check size={12} />
                          </div>
                        ) : isCurrent ? (
                          <Loader2 size={14} className="animate-spin text-indigo-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-[11px] uppercase tracking-wider">
                          {stepKey}
                        </div>
                        <div className="text-[11px] truncate text-slate-400">
                          {update?.message || defaultLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : data ? (
            <>
              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Hero Score & Executive Summary Card */}
                  <div className="p-4 sm:p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 shadow-xl">
                    <div className="text-center p-3 sm:p-4 rounded-xl bg-indigo-900/40 border border-indigo-500/30 w-full sm:w-auto sm:min-w-[120px] shrink-0">
                      <div className="text-4xl font-black font-mono text-indigo-200">
                        {data.metrics.redundancyScore}
                      </div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-bold mt-1">
                        Score / 100
                      </div>
                      <div className={`mt-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        data.metrics.redundancyScore >= 80 ? 'text-emerald-400 bg-emerald-950/50' : data.metrics.redundancyScore >= 60 ? 'text-amber-400 bg-amber-950/50' : 'text-rose-400 bg-rose-950/50'
                      }`}>
                        {data.metrics.redundancyScore >= 80 ? 'Resilient' : data.metrics.redundancyScore >= 60 ? 'Moderate Risk' : 'Critical Risks'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-400 shrink-0" />
                        <span>Executive Architecture Summary</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                        {data.analysis.executiveSummary}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                        <span>Services: <strong className="text-slate-200">{data.metrics.services}</strong></span>
                        <span>Databases: <strong className="text-slate-200">{data.metrics.databases}</strong></span>
                        <span>Caches: <strong className="text-slate-200">{data.metrics.caches}</strong></span>
                        <span>Queues: <strong className="text-slate-200">{data.metrics.queues}</strong></span>
                        <span>Fan-Out: <strong className="text-slate-200">{data.metrics.fanOut}x</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Validated Architectural Strengths (What Was Designed Correctly) */}
                  {data.analysis.strengths && data.analysis.strengths.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span>Validated Architectural Strengths ({data.analysis.strengths.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {data.analysis.strengths.map((str, i) => (
                          <div key={i} className="text-xs text-slate-200 flex items-start gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{str}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High-Level Scalability Bottlenecks */}
                  {data.analysis.scalabilityBottlenecks && data.analysis.scalabilityBottlenecks.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-950/15 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-amber-400" />
                        <span>Scalability & Performance Bottlenecks</span>
                      </div>
                      <div className="space-y-2">
                        {data.analysis.scalabilityBottlenecks.map((bot, i) => (
                          <div key={i} className="text-xs text-slate-200 flex items-start gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-amber-500/20">
                            <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{bot}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actionable Recommendations */}
                  {data.analysis.recommendations && data.analysis.recommendations.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/15 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <Lightbulb size={16} className="text-cyan-400" />
                        <span>Strategic Architectural Recommendations</span>
                      </div>
                      <div className="space-y-2">
                        {data.analysis.recommendations.map((rec, i) => (
                          <div key={i} className="text-xs text-slate-200 flex items-start gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-cyan-500/20">
                            <span className="font-mono text-cyan-400 font-bold mt-0.5">{i + 1}.</span>
                            <span className="leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACTIONABLE FINDINGS (3-PART BREAKDOWN) */}
              {activeTab === 'findings' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldAlert size={16} className="text-rose-400" />
                        <span>Rule Engine Violations & Architecture Vulnerabilities</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Structured 3-part engineering analysis: Problem statement, production failure scenario, and prescribed fix.
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                      <button
                        onClick={() => setFilterSeverity('ALL')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                          filterSeverity === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({violations.length})
                      </button>
                      <button
                        onClick={() => setFilterSeverity('CRITICAL')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                          filterSeverity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
                        }`}
                      >
                        Critical ({violations.filter((v) => v.severity === 'CRITICAL').length})
                      </button>
                      <button
                        onClick={() => setFilterSeverity('WARNING')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                          filterSeverity === 'WARNING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-300'
                        }`}
                      >
                        Warnings ({violations.filter((v) => v.severity !== 'CRITICAL').length})
                      </button>
                    </div>
                  </div>

                  {filteredViolations.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm text-emerald-200">Zero violations found!</div>
                        <p className="text-emerald-400/80 mt-0.5">
                          All deterministic rules and structural resilience targets are satisfied.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredViolations.map((v, i) => {
                        const isCrit = v.severity === 'CRITICAL';
                        return (
                          <div
                            key={i}
                            className={`p-4 sm:p-5 rounded-2xl border ${
                              isCrit
                                ? 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20'
                                : 'border-amber-500/40 bg-amber-950/15'
                            } space-y-4`}
                          >
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {isCrit ? (
                                  <ShieldAlert size={18} className="text-rose-400 shrink-0" />
                                ) : (
                                  <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                                )}
                                <h4 className="font-bold text-sm text-white truncate">{v.title}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                  isCrit
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {v.severity}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                  {v.category}
                                </span>
                              </div>
                            </div>

                            {/* 3-Part Production Drilldown */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              {/* 1. Problem Statement */}
                              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <Info size={12} className="text-slate-400" />
                                  <span>Identified Problem</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed font-sans mt-1">
                                  {v.message}
                                </p>
                              </div>

                              {/* 2. Production Impact / Failure Scenario */}
                              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                                  <AlertTriangle size={12} className="text-rose-400" />
                                  <span>Production Impact & Risk</span>
                                </div>
                                <p className="text-rose-200/90 leading-relaxed font-sans mt-1">
                                  {v.impact || 'Risk of service disruption, cascading timeout failure, or single-node downtime under production traffic.'}
                                </p>
                              </div>

                              {/* 3. How to Resolve */}
                              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                  <Wrench size={12} className="text-emerald-400" />
                                  <span>Prescribed Solution</span>
                                </div>
                                <p className="text-emerald-200/90 leading-relaxed font-sans mt-1">
                                  {v.remediation}
                                </p>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="pt-1 flex items-center justify-end gap-2.5 flex-wrap">
                              {onFocusNode && (
                                <button
                                  onClick={() => {
                                    if (v.affectedNodes && v.affectedNodes.length > 0) {
                                      onFocusNode(v.affectedNodes[0]);
                                    }
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  title="Return to canvas and focus affected component"
                                >
                                  <Crosshair size={13} />
                                  <span>Canvas View</span>
                                </button>
                              )}
                              {resolvedViolationIds.has(v.id || v.ruleId || String(i)) ? (
                                <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                  <Check size={13} className="text-emerald-400" />
                                  <span>Resolved on Canvas</span>
                                </div>
                              ) : onQuickFix ? (
                                <button
                                  onClick={() => {
                                    const key = v.id || v.ruleId || String(i);
                                    setResolvedViolationIds((prev) => new Set([...prev, key]));

                                    const remediationLower = (v.remediation || '').toLowerCase();
                                    const titleLower = (v.title || '').toLowerCase();
                                    const msgLower = (v.message || '').toLowerCase();

                                    const isReplicaIssue =
                                      remediationLower.includes('replica') ||
                                      titleLower.includes('replica') ||
                                      titleLower.includes('spof') ||
                                      msgLower.includes('replica');
                                    const isCacheIssue =
                                      remediationLower.includes('cache') ||
                                      titleLower.includes('cache') ||
                                      msgLower.includes('cache');
                                    const isQueueIssue =
                                      remediationLower.includes('queue') ||
                                      remediationLower.includes('broker') ||
                                      titleLower.includes('queue') ||
                                      msgLower.includes('queue');

                                    if (isReplicaIssue) {
                                      onQuickFix({
                                        id: key,
                                        title: v.title,
                                        problem: v.message,
                                        quickFix: {
                                          actionType: 'scale_replica',
                                          targetNodeIds: v.affectedNodes,
                                          targetReplicas: 2,
                                          label: 'Scale to 2 Replicas',
                                        },
                                      });
                                    } else if (isCacheIssue) {
                                      onQuickFix({
                                        id: key,
                                        title: v.title,
                                        problem: v.message,
                                        quickFix: {
                                          actionType: 'add_component',
                                          catalogId: 'db-redis',
                                          label: 'Add Redis Cache',
                                        },
                                      });
                                    } else if (isQueueIssue) {
                                      onQuickFix({
                                        id: key,
                                        title: v.title,
                                        problem: v.message,
                                        quickFix: {
                                          actionType: 'add_component',
                                          catalogId: 'data-message-broker',
                                          label: 'Add Message Broker',
                                        },
                                      });
                                    } else {
                                      onQuickFix({
                                        id: key,
                                        title: v.title,
                                        problem: v.message,
                                        quickFix: {
                                          actionType: 'scale_replica',
                                          targetNodeIds: v.affectedNodes,
                                          targetReplicas: 2,
                                          label: 'Resolve Violation',
                                        },
                                      });
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Zap size={13} className="fill-current" />
                                  <span>Resolve Violation</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FULL TECHNICAL SYNTHESIS (MARKDOWN REPORT) */}
              {activeTab === 'synthesis' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/30 bg-purple-950/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" />
                        <h3 className="text-sm font-bold text-white">Full LLM Architectural Synthesis</h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Expert Technical Report
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Comprehensive architectural assessment generated by the model combining topological metrics, rule constraints, and semantic knowledge base retrievals.
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl font-sans">
                    {renderMarkdown(data.rawCritiqueText || data.analysis.executiveSummary)}
                  </div>
                </div>
              )}

              {/* TAB 4: RAG STANDARDS & RETRIEVED PATTERNS */}
              {activeTab === 'standards' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">Grounded Architectural Knowledge Base</h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        pgvector Semantic Search
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Industry-standard architectural blueprints matched via vector similarity to provide grounded evidence for critique recommendations.
                    </p>
                  </div>

                  {(!data.citedPatterns || data.citedPatterns.length === 0) ? (
                    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 text-center">
                      No external knowledge base citations required for this graph topology.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {data.citedPatterns.map((doc, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/25 space-y-2 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-cyan-200 flex items-center gap-1.5 truncate">
                              <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                              <span className="truncate">{doc.title}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                              {Math.round(doc.similarity * 100)}% Match
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            Blueprint Key: <span className="text-slate-300 font-semibold">{doc.docKey}</span> | Topic: <span className="text-slate-300">{doc.topic}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {doc.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] sm:text-xs text-slate-400 shrink-0">
          <span className="text-center sm:text-left flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Validated against Enterprise Architecture Guidelines (RAG + Graph Algorithms)</span>
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors cursor-pointer text-center"
          >
            Close Critique
          </button>
        </div>
      </div>
    </div>
  );
};

function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="p-3.5 my-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-sm font-bold text-indigo-300 mt-4 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>{trimmed.replace('### ', '')}</span>
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-base font-bold text-white mt-5 mb-2 pb-1.5 border-b border-slate-800">
          {trimmed.replace('## ', '')}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${index}`} className="text-lg font-bold text-white mt-6 mb-2.5">
          {trimmed.replace('# ', '')}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${index}`} className="text-xs text-slate-300 ml-4 list-disc my-1.5 leading-relaxed">
          {renderFormattedInline(trimmed.substring(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <div key={`num-${index}`} className="text-xs text-slate-300 ml-1 my-1.5 leading-relaxed flex items-start gap-2">
          <span className="font-mono text-indigo-400 font-bold shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
          <span>{renderFormattedInline(trimmed.replace(/^\d+\.\s*/, ''))}</span>
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${index}`} className="text-xs text-slate-300 my-1.5 leading-relaxed">
          {renderFormattedInline(trimmed)}
        </p>
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
}

function renderFormattedInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
