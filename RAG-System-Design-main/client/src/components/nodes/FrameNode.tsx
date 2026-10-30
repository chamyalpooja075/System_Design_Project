import { memo, useState, useCallback } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import { Frame, Trash2, Edit2, Check } from 'lucide-react';

export interface FrameNodeData {
  label?: string;
  color?: string;
  borderStyle?: 'dashed' | 'solid';
  isAnnotation?: boolean;
}

const FRAME_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#64748b'];

export const FrameNode = memo(({ id, data, selected }: NodeProps) => {
  const frameData = data as unknown as FrameNodeData;
  const label = frameData.label || 'VPC Boundary / Region';
  const color = frameData.color || '#3b82f6';
  const borderStyle = frameData.borderStyle || 'dashed';

  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(label);

  const { updateNodeData, deleteElements } = useReactFlow();

  const handleColorChange = useCallback(
    (c: string) => {
      updateNodeData(id, { color: c });
    },
    [id, updateNodeData]
  );

  const handleSave = useCallback(() => {
    setIsEditing(false);
    updateNodeData(id, { label: labelText });
  }, [id, labelText, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div className="relative group w-full h-full min-w-[120px] min-h-[80px]">
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineClassName="!border-indigo-400 !border-dashed"
        handleClassName="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white !rounded-sm hover:!bg-indigo-400"
      />

      {/* Floating Toolbar on Selection */}
      {selected && (
        <div
          className="absolute -top-10 left-4 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {FRAME_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-3 h-3 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                  color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-[1px] h-3 bg-slate-700" />
          <button
            onClick={() => setIsEditing((p) => !p)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rename boundary"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Delete boundary (Delete / Backspace)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Boundary Frame */}
      <div
        className={`w-full h-full rounded-2xl border-2 transition-all backdrop-blur-[2px] ${
          selected ? 'ring-2 ring-indigo-400/80 shadow-2xl' : ''
        }`}
        style={{
          borderColor: color,
          borderStyle: borderStyle,
          backgroundColor: `${color}08`,
        }}
      >
        {/* Frame Header Pill */}
        <div
          className="absolute top-2 left-3 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-sm select-none"
          style={{
            backgroundColor: `${color}25`,
            color: '#f8fafc',
            border: `1px solid ${color}40`,
          }}
          onDoubleClick={() => setIsEditing(true)}
        >
          <Frame size={13} style={{ color }} />
          {isEditing ? (
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={labelText}
                autoFocus
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
              />
              <button onClick={handleSave} className="p-0.5 hover:text-emerald-400 cursor-pointer">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <span>{label}</span>
          )}
        </div>
      </div>
    </div>
  );
});
