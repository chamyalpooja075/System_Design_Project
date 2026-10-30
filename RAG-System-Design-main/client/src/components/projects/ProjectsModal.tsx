import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Clock, Check, X, Layers, AlertCircle } from 'lucide-react';
import { projectService, type ProjectSummary } from '../../services/api';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: (name: string, description?: string) => Promise<void>;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  onCreateNewProject,
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectService.list();
      setProjects(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load projects from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectDesc('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateNewProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectDesc('');
      await fetchProjects();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create new project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${projectName}" from the database?`)) {
      return;
    }

    try {
      await projectService.remove(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete project');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0d121f] p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
              <FolderOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Architecture Projects</h2>
              <p className="text-xs text-slate-400">All architectures saved in your database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Projects List or Create Form */}
        <div className="py-4 overflow-y-auto flex-1 space-y-2.5">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
              <h3 className="text-xs font-semibold text-indigo-300">New Architecture Project</h3>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Real-Time Chat System"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Short architecture summary, latency budget, or scale goals..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProjectName.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          ) : isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mb-2"></div>
              <p>Fetching saved architectures from database...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              <Layers size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-medium text-slate-400">No saved projects found in database</p>
              <p className="text-[11px] text-slate-600 mt-1">Create your first project or save your current canvas.</p>
            </div>
          ) : (
            projects.map((proj) => {
              const isSelected = proj.id === currentProjectId;
              const dateStr = new Date(proj.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const latestVer = proj.diagrams?.[0]?.version || 1;

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-white truncate">{proj.name}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-medium flex items-center gap-1">
                          <Check size={10} /> Active
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                        v{latestVer}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-400 truncate mb-1">{proj.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                      <Clock size={11} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, proj.id, proj.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus size={13} />
              <span>New Project</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
