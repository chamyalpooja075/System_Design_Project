import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import { Trash2, Edit2, Check } from 'lucide-react';

export interface ShapeNodeData {
  shapeType?: 'rect' | 'circle' | 'arrow' | 'line';
  label?: string;
  color?: string;
  borderStyle?: 'solid' | 'dashed';
  isAnnotation?: boolean;
}

const COLOR_PRESETS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Slate', hex: '#64748b' },
];

export const ShapeNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as unknown as ShapeNodeData;
  const shapeType = shapeData.shapeType || 'rect';
  const color = shapeData.color || '#6366f1';
  const borderStyle = shapeData.borderStyle || 'solid';

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(shapeData.label || '');

  const { updateNodeData, deleteElements } = useReactFlow();

  const handleColorChange = useCallback(
    (hex: string) => {
      updateNodeData(id, { color: hex });
    },
    [id, updateNodeData]
  );

  const handleBorderToggle = useCallback(() => {
    const nextStyle = borderStyle === 'solid' ? 'dashed' : 'solid';
    updateNodeData(id, { borderStyle: nextStyle });
  }, [id, borderStyle, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const handleSaveLabel = useCallback(() => {
    setIsEditingLabel(false);
    updateNodeData(id, { label: labelText });
  }, [id, labelText, updateNodeData]);

  return (
    <div className="relative group w-full h-full min-w-[50px] min-h-[40px]">
      {/* Interactive Resize Handles */}
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={40}
        lineClassName="!border-indigo-400 !border-dashed"
        handleClassName="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white !rounded-sm hover:!bg-indigo-400"
      />

      {/* Floating Action Toolbar on Selection */}
      {selected && (
        <div 
          className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Color Presets */}
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleColorChange(preset.hex)}
                className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                  color === preset.hex ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : ''
                }`}
                style={{ backgroundColor: preset.hex }}
                title={preset.name}
              />
            ))}
          </div>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Border Style Toggle */}
          <button
            onClick={handleBorderToggle}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle solid/dashed border"
          >
            {borderStyle === 'solid' ? 'Solid' : 'Dashed'}
          </button>

          {/* Edit Label */}
          <button
            onClick={() => setIsEditingLabel((prev) => !prev)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Edit label"
          >
            <Edit2 size={12} />
          </button>

          {/* Delete Shape */}
          <button
            onClick={handleDelete}
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Delete shape (Delete / Backspace)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* 4 Port Connection Handles for Diagramming */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-slate-300 hover:!bg-indigo-400 !border-2 !border-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Shape Geometry */}
      <div
        className={`w-full h-full flex items-center justify-center p-3 transition-all duration-150 backdrop-blur-md select-none ${
          shapeType === 'circle' ? 'rounded-full' : 'rounded-2xl'
        } ${selected ? 'ring-2 ring-indigo-400 shadow-xl shadow-indigo-500/20' : ''}`}
        style={{
          backgroundColor: `${color}18`, // 10% opacity fill
          borderColor: color,
          borderWidth: 2,
          borderStyle: borderStyle,
        }}
        onDoubleClick={() => setIsEditingLabel(true)}
      >
        {isEditingLabel ? (
          <div 
            className="flex items-center gap-1.5 w-full max-w-[85%]" 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={labelText}
              autoFocus
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSaveLabel();
                if (e.key === 'Escape') setIsEditingLabel(false);
              }}
              className="w-full bg-slate-950/90 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white text-center focus:outline-none"
            />
            <button
              onClick={handleSaveLabel}
              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shrink-0"
            >
              <Check size={11} />
            </button>
          </div>
        ) : (
          shapeData.label && (
            <span 
              className="text-xs font-semibold text-center truncate px-2 select-none"
              style={{ color: '#f8fafc' }}
            >
              {shapeData.label}
            </span>
          )
        )}
      </div>
    </div>
  );
});
