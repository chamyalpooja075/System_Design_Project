import React, { useEffect, useState } from 'react';
import { History, RotateCcw, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { projectService } from '../../services/api';

interface VersionItem {
  id: string;
  version: number;
  createdAt: string;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  currentVersion?: number;
  onRestoreVersion: (nodes: any[], edges: any[], version: number) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentVersion,
  onRestoreVersion,
}) => {
  const [history, setHistory] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      setIsLoading(true);
      setError(null);
      projectService
        .getDiagramHistory(projectId)
        .then((items) => setHistory(items))
        .catch((err) => setError(err?.message || 'Failed to fetch version history'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleRestore = async (version: number) => {
    if (!projectId) return;
    setRestoringVersion(version);
    try {
      const diagram = await projectService.getDiagramVersion(projectId, version);
      if (diagram && diagram.nodes) {
        onRestoreVersion(diagram.nodes, diagram.edges || [], version);
        onClose();
      }
    } catch (err: any) {
      setError(`Failed to restore version ${version}: ${err?.message}`);
    } finally {
      setRestoringVersion(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Version History</h3>
              <p className="text-xs text-slate-400">Review & restore past architectural revisions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mb-2"></div>
              <p>Loading historical snapshots...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <History size={24} className="mx-auto mb-2 opacity-40" />
              <p>No previous versions saved yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Hit "Save" on the canvas to create your first revision snapshot.</p>
            </div>
          ) : (
            history.map((item) => {
              const isCurrent = currentVersion === item.version;
              const dateStr = new Date(item.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'bg-indigo-950/30 border-indigo-500/40'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-200">
                      v{item.version}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Clock size={12} className="text-slate-500" />
                        <span>{dateStr}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={11} /> Current on canvas
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRestore(item.version)}
                      disabled={restoringVersion !== null}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      <span>{restoringVersion === item.version ? 'Restoring...' : 'Restore'}</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
