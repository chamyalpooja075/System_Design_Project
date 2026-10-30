import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Trash2,
  X,
  ChevronDown,
  Check,
  Zap,
  Search,
  Edit3,
} from 'lucide-react';
import type { ProtocolType } from '../../types/architecture';
import {
  ALL_PROTOCOLS,
  getProtocolConfig,
  type ProtocolDefinition,
} from '../../data/protocolCatalog';

export interface EdgeConfigToolbarProps {
  edgeId: string;
  sourceLabel: string;
  targetLabel: string;
  currentProtocol: ProtocolType;
  isAsync: boolean;
  onUpdateProtocol: (edgeId: string, protocol: ProtocolType, isAsync?: boolean) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose: () => void;
}

export const EdgeConfigToolbar: React.FC<EdgeConfigToolbarProps> = ({
  edgeId,
  sourceLabel,
  targetLabel,
  currentProtocol,
  isAsync,
  onUpdateProtocol,
  onDeleteEdge,
  onClose,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsCustomMode(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setIsCustomMode(false);
    }
  }, [isDropdownOpen]);

  const activeProto = useMemo(
    () => getProtocolConfig(currentProtocol, isAsync),
    [currentProtocol, isAsync]
  );

  const categories = ['All', 'Web & API', 'Database & Storage', 'Messaging & Streaming', 'Networking & Transport', 'Security & File', 'Custom'];

  const filteredProtocols = useMemo(() => {
    return ALL_PROTOCOLS.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        p.label.toLowerCase().includes(query) ||
        p.purpose.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handleSelectProtocol = (protoDef: ProtocolDefinition) => {
    if (protoDef.id === 'Custom') {
      setIsCustomMode(true);
      setCustomInput(currentProtocol === 'Custom' ? '' : currentProtocol);
      return;
    }
    onUpdateProtocol(edgeId, protoDef.id, protoDef.defaultAsync);
    setIsDropdownOpen(false);
    setIsCustomMode(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed) {
      onUpdateProtocol(edgeId, trimmed, isAsync);
      setIsDropdownOpen(false);
      setIsCustomMode(false);
    }
  };

  const handleToggleAsync = () => {
    onUpdateProtocol(edgeId, currentProtocol, !isAsync);
  };

  return (
    <div
      className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-[#0b0f19]/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none max-w-[calc(100vw-1.5rem)] overflow-x-auto scrollbar-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Edge Context: Source -> Target */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium shrink-0">
        <span className="text-slate-100 max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] truncate" title={sourceLabel}>
          {sourceLabel}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-slate-100 max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] truncate" title={targetLabel}>
          {targetLabel}
        </span>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      {/* Protocol Picker Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${activeProto.badgeBg} ${activeProto.badgeBorder} ${activeProto.badgeText} hover:brightness-110 shadow-md`}
          title={`Current Protocol: ${currentProtocol} — ${activeProto.purpose}`}
        >
          <span className="max-w-[110px] truncate">{currentProtocol}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 max-h-[420px] flex flex-col bg-slate-950/98 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in duration-100">
            {/* Search Filter Header */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search protocols & purposes..."
                className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Custom Mode Input Box */}
            {isCustomMode ? (
              <form onSubmit={handleSaveCustom} className="p-2 space-y-2 bg-slate-900/90 rounded-xl border border-purple-500/30">
                <div className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Define Custom Protocol
                </div>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. Avro, ZeroMQ, SOAP, IPC..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="px-2 py-1 rounded text-[11px] text-slate-400 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </form>
            ) : (
              /* Protocol List */
              <div className="overflow-y-auto space-y-1 flex-1 pr-1 max-h-64">
                {filteredProtocols.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No protocols found for "{searchQuery}"
                  </div>
                ) : (
                  filteredProtocols.map((p) => {
                    const isSelected = p.id.toLowerCase() === currentProtocol.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProtocol(p)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                            : 'hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-xs text-slate-200 group-hover:text-cyan-300">
                              {p.label}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-sans">
                              {p.category}
                            </span>
                            {p.defaultAsync && (
                              <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-400 border border-amber-600/30">
                                Async
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate mt-0.5">
                            {p.purpose}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Async / Sync Delivery Toggle */}
      <button
        onClick={handleToggleAsync}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
          isAsync
            ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
            : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title={isAsync ? 'Asynchronous connection (dashed line)' : 'Synchronous connection (solid line)'}
      >
        <Zap className={`w-3 h-3 ${isAsync ? 'text-amber-400 fill-amber-400/20' : 'text-slate-400'}`} />
        <span>{isAsync ? 'Async' : 'Sync'}</span>
      </button>

      <div className="h-4 w-px bg-slate-800" />

      {/* Delete Edge Action */}
      <button
        onClick={() => onDeleteEdge(edgeId)}
        className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
        title="Delete Connection (Delete / Backspace)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Close Toolbar */}
      <button
        onClick={onClose}
        className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        title="Deselect Connection"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
