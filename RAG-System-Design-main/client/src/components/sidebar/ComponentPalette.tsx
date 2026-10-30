import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Boxes,
  GripHorizontal
} from 'lucide-react';
import { 
  COMPONENT_CATALOG, 
  COMPONENT_SECTIONS, 
  type CatalogItem, 
  type ComponentSection 
} from '../../data/componentLibrary';
import type { ComponentCategory } from '../../types/architecture';

interface ComponentPaletteProps {
  onAddNode: (category: ComponentCategory, label: string, technology: string, catalogId?: string, brandColor?: string) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onAddNode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<ComponentSection | 'All'>('All');

  const filteredItems = useMemo(() => {
    return COMPONENT_CATALOG.filter((item) => {
      if (activeSection !== 'All' && item.section !== activeSection) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.technology.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeSection]);

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    e.dataTransfer.setData('application/reactflow/catalog-item', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-72 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex flex-col h-full z-10 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Boxes size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Component Library</h2>
            <p className="text-[10px] text-slate-400">{COMPONENT_CATALOG.length} architecture primitives</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter components..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-400 hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Scroll */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
          <button
            onClick={() => setActiveSection('All')}
            className={`px-2 py-0.5 rounded shrink-0 font-medium transition-colors ${
              activeSection === 'All'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {COMPONENT_SECTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-2 py-0.5 rounded shrink-0 font-medium transition-colors whitespace-nowrap ${
                activeSection === sec
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Item List */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-1.5">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => onAddNode(item.category, item.name, item.technology, item.id, item.brandColor)}
              className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800/80 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 transition-all duration-150 group text-left cursor-grab active:cursor-grabbing"
              title={`${item.name} • ${item.technology}\n(Click to add or drag onto canvas)`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className="w-7 h-7 rounded-lg border border-slate-800 flex items-center justify-center bg-slate-800/50 shrink-0"
                  style={{ color: item.brandColor || '#94a3b8' }}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.technology}
                  </div>
                </div>
              </div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                {item.category}
              </span>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs">
            No components match "{searchQuery}"
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
        <GripHorizontal size={12} />
        <span>Click or drag onto canvas</span>
      </div>
    </aside>
  );
};
