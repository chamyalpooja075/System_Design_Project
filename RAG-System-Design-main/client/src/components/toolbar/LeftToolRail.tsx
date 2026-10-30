import React from 'react';
import {
  Sparkles,
  MousePointer,
  Hand,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Pen,
  Type,
  Frame,
  MessageSquare,
  Plus,
} from 'lucide-react';

interface LeftToolRailProps {
  isPaletteOpen: boolean;
  onTogglePalette: () => void;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  onRunAiAssistant: () => void;
}

export const LeftToolRail: React.FC<LeftToolRailProps> = ({
  isPaletteOpen,
  onTogglePalette,
  activeTool,
  setActiveTool,
  onRunAiAssistant,
}) => {
  const tools = [
    { id: 'select', label: 'Select / Move (V)', icon: MousePointer, key: 'V' },
    { id: 'pan', label: 'Hand / Pan Canvas (H)', icon: Hand, key: 'H' },
    { id: 'rect', label: 'Rectangle (R)', icon: Square, key: 'R' },
    { id: 'circle', label: 'Circle / Oval (O)', icon: Circle, key: 'O' },
    { id: 'arrow', label: 'Arrow (A)', icon: ArrowUpRight, key: 'A' },
    { id: 'line', label: 'Line (L)', icon: Minus, key: 'L' },
    { id: 'pen', label: 'Pencil (D)', icon: Pen, key: 'D' },
    { id: 'text', label: 'Text (T)', icon: Type, key: 'T' },
    { id: 'frame', label: 'Frame (F)', icon: Frame, key: 'F' },
    { id: 'comment', label: 'Comment (C)', icon: MessageSquare, key: 'C' },
  ];

  return (
    <aside className="fixed bottom-3 left-1/2 -translate-x-1/2 md:translate-x-0 md:static md:bottom-auto md:left-auto flex flex-row md:flex-col items-center p-1 md:py-2.5 z-30 select-none shrink-0 gap-1 shadow-2xl rounded-2xl md:rounded-none bg-[#0c101a]/95 md:bg-[#0c101a] border border-slate-800/90 md:border-y-0 md:border-l-0 md:border-r md:w-13 max-w-[calc(100vw-1.5rem)] overflow-x-auto md:overflow-visible scrollbar-none backdrop-blur-xl md:backdrop-blur-none">
      {/* Top Toggle / Add Component & AI Action */}
      <div className="flex flex-row md:flex-col items-center gap-1 shrink-0">
        <button
          onClick={onTogglePalette}
          className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isPaletteOpen 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Add Architecture Component (+)"
        >
          <Plus size={17} className={`transition-transform duration-200 ${isPaletteOpen ? 'rotate-45' : ''}`} />
        </button>

        <button
          onClick={onRunAiAssistant}
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 transition-all cursor-pointer relative group shrink-0"
          title="AI Architecture Assistant (⌘J)"
        >
          <Sparkles size={16} />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
        </button>
      </div>

      <div className="w-[1px] h-5 md:w-6 md:h-[1px] bg-slate-800 mx-1 md:my-1 shrink-0" />

      {/* Drawing & Selection Tools */}
      <div className="flex flex-row md:flex-col gap-1 items-center shrink-0">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative shrink-0 ${
                isActive
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
              title={tool.label}
            >
              <Icon size={15} />
              <span className="hidden md:block absolute left-11 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
