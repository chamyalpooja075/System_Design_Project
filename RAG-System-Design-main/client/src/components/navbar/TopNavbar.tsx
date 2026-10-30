import React from 'react';
import { 
  Workflow, 
  Check, 
  LayoutDashboard, 
  BarChart3, 
  MessageSquareCode, 
  Save,
  LogIn,
  LogOut,
  FolderOpen,
  Undo2,
  Redo2,
  History,
  CircleDot,
  Activity,
} from 'lucide-react';
import type { UserProfile } from '../../services/api';

interface TopNavbarProps {
  activeTab: 'canvas' | 'metrics' | 'interview';
  setActiveTab: (tab: 'canvas' | 'metrics' | 'interview') => void;
  projectName: string;
  isSaving: boolean;
  onSave: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProjectsModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenHistory?: () => void;
  isDirty?: boolean;
  currentVersion?: number;
  isMetricsOpen?: boolean;
  onToggleMetrics?: () => void;
  redundancyScore?: number;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  setActiveTab,
  projectName,
  isSaving,
  onSave,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenProjectsModal,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenHistory,
  isDirty = false,
  currentVersion = 1,
  isMetricsOpen = false,
  onToggleMetrics,
  redundancyScore = 100,
}) => {
  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.slice(0, 2).toUpperCase() || 'SD';

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-2.5 sm:px-4 2xl:px-8 flex items-center justify-between z-20 select-none shrink-0 w-full">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
          <Workflow className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-xs sm:text-sm text-slate-100 whitespace-nowrap">Studio</span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="hidden sm:inline text-xs text-slate-300 font-medium truncate max-w-[120px] md:max-w-[200px] 2xl:max-w-xs" title={projectName}>
              {projectName}
            </span>
            {currentUser && onOpenProjectsModal && (
              <button
                onClick={onOpenProjectsModal}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Switch Project"
              >
                <FolderOpen size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] truncate">
            {isSaving ? (
              <span className="text-indigo-400 flex items-center gap-1">
                <span className="inline-block animate-spin rounded-full h-2 w-2 border-2 border-indigo-400 border-t-transparent"></span>
                <span className="hidden sm:inline">Autosaving...</span>
              </span>
            ) : isDirty ? (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <CircleDot size={9} />
                <span className="hidden xs:inline">Unsaved</span>
              </span>
            ) : currentUser ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check size={11} />
                <span className="hidden md:inline">Synced v{currentVersion}</span>
              </span>
            ) : (
              <span className="text-slate-500">Draft</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Mode Navigation Tabs & Undo/Redo Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Undo / Redo Toolbar */}
        <div className="hidden sm:flex items-center bg-slate-900/80 border border-slate-800/80 p-0.5 rounded-xl shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800/80 p-0.5 sm:p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'canvas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Diagram Canvas"
          >
            <LayoutDashboard size={14} />
            <span className="hidden md:inline">Canvas</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Architecture Metrics"
          >
            <BarChart3 size={14} />
            <span className="hidden md:inline">Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'interview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Interview Defense Mode"
          >
            <MessageSquareCode size={14} />
            <span className="hidden md:inline">Interview</span>
          </button>
        </div>
      </div>

      {/* Right Actions: Mobile Metrics Toggle, Version History, Save, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Metrics Drawer / Sidebar Toggle Button */}
        {activeTab === 'canvas' && onToggleMetrics && (
          <button
            onClick={onToggleMetrics}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
              isMetricsOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isMetricsOpen ? 'Collapse Metrics Panel (>>)' : 'Open Metrics Panel (<<)'}
          >
            <Activity size={14} className="text-emerald-400" />
            <span className="text-[11px] font-bold">{redundancyScore}</span>
            <span className="hidden md:inline font-sans font-medium text-[11px] text-slate-300">
              {isMetricsOpen ? 'Metrics >>' : 'Metrics <<'}
            </span>
          </button>
        )}

        {currentUser && onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            title="View & Restore Diagram Versions"
          >
            <History size={13} className="text-indigo-400" />
            <span className="hidden xl:inline">History (v{currentVersion})</span>
          </button>
        )}

        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm shadow-indigo-500/10 disabled:opacity-50"
          title="Save diagram"
        >
          <Save size={13} />
          <span className="hidden sm:inline">{isSaving ? '...' : 'Save'}</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-0.5 sm:mx-1" />

        {currentUser ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
              title={`${currentUser.name || currentUser.email} (${currentUser.isAdmin ? 'Admin' : 'Engineer'})`}
            >
              {userInitials}
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogIn size={13} />
            <span className="hidden xs:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
