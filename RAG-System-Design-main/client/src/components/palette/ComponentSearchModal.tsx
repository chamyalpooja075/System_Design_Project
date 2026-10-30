import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Sparkles,
  GripHorizontal,
} from 'lucide-react';
import { 
  COMPONENT_CATALOG, 
  COMPONENT_SECTIONS, 
  type CatalogItem, 
  type ComponentSection 
} from '../../data/componentLibrary';

interface ComponentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (item: CatalogItem) => void;
  onSelectTemplate?: (templateName: string) => void;
}

export const ComponentSearchModal: React.FC<ComponentSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<ComponentSection | 'All'>('All');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items based on active section and search query
  const filteredItems = useMemo(() => {
    return COMPONENT_CATALOG.filter((item) => {
      // Filter by section
      if (activeSection !== 'All' && item.section !== activeSection) {
        return false;
      }

      // Filter by search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.technology.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeSection]);

  // Group filtered items by section
  const sections = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};

    if (activeSection === 'All') {
      COMPONENT_SECTIONS.forEach((sec) => {
        groups[sec] = [];
      });
    } else {
      groups[activeSection] = [];
    }

    filteredItems.forEach((item) => {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    });

    return groups;
  }, [filteredItems, activeSection]);

  const toggleExpand = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    e.dataTransfer.setData('application/reactflow/catalog-item', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 md:left-13 top-0 bottom-0 w-full sm:w-[420px] max-w-full sm:max-w-md bg-[#0c101a]/95 backdrop-blur-2xl border-r border-slate-800/90 shadow-2xl flex flex-col z-40 animate-in fade-in slide-in-from-left-2 duration-150 select-none">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Architecture Library</h2>
              <p className="text-[10px] text-slate-400">{COMPONENT_CATALOG.length} verified cloud & system primitives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Close Library (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Web, Microservice, Postgres, LLM, Kafka..."
            className="w-full pl-9 pr-9 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="absolute right-3 text-[10px] text-slate-500 border border-slate-700/60 rounded px-1.5 py-0.2">
              /
            </kbd>
          )}
        </div>

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          <button
            onClick={() => setActiveSection('All')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer ${
              activeSection === 'All'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({COMPONENT_CATALOG.length})
          </button>
          {COMPONENT_SECTIONS.map((sec) => {
            const count = COMPONENT_CATALOG.filter((i) => i.section === sec).length;
            const isSelected = activeSection === sec;
            return (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Catalog Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {Object.entries(sections).map(([sectionTitle, items]) => {
          if (items.length === 0) return null;

          const isExpanded = expandedSections[sectionTitle] || searchQuery.length > 0 || activeSection !== 'All';
          const displayItems = isExpanded ? items : items.slice(0, 4);
          const remainingCount = items.length - 4;

          return (
            <div key={sectionTitle} className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 px-1">
                <span>{sectionTitle}</span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                  {items.length}
                </span>
              </div>

              {/* 4-column Grid */}
              <div className="grid grid-cols-4 gap-2">
                {displayItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => onSelectComponent(item)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-800 hover:border-indigo-500/50 hover:shadow-lg transition-all group cursor-grab active:cursor-grabbing text-center relative select-none"
                      title={`${item.name} • ${item.technology}\n${item.description || ''}\n(Click to add or drag onto canvas)`}
                    >
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/60 group-hover:bg-slate-700/70 transition-transform group-hover:scale-105"
                        style={{ color: item.brandColor || '#94a3b8' }}
                      >
                        <Icon size={19} />
                      </div>
                      <span className="text-[10px] font-medium text-slate-300 group-hover:text-white mt-1.5 truncate max-w-full px-0.5">
                        {item.name}
                      </span>
                    </div>
                  );
                })}

                {/* +N More Button when collapsed */}
                {!isExpanded && remainingCount > 0 && (
                  <button
                    onClick={() => toggleExpand(sectionTitle)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 hover:bg-slate-800/70 hover:border-indigo-500/50 transition-all group cursor-pointer text-center"
                    title={`Show ${remainingCount} more in ${sectionTitle}`}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 font-mono font-bold text-xs">
                      +{remainingCount}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-indigo-300 mt-1.5">
                      {remainingCount} more
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty Search Result */}
        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Search size={24} className="mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No components found for "{searchQuery}"</p>
            <p className="text-[11px] text-slate-600 mt-1">Try searching by category, technology, or tag</p>
          </div>
        )}
      </div>

      {/* Footer Info with Drag Instructions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <GripHorizontal size={14} className="text-slate-500" />
          <span>Click or drag onto canvas</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
