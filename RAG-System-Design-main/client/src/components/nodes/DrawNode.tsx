import { memo, useCallback } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

export interface DrawNodeData {
  path: string;
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  isAnnotation?: boolean;
}

const STROKE_COLORS = ['#a855f7', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];

export const DrawNode = memo(({ id, data, selected }: NodeProps) => {
  const drawData = data as unknown as DrawNodeData;
  const strokeColor = drawData.strokeColor || '#a855f7';
  const strokeWidth = drawData.strokeWidth || 3;
  const width = Math.max(drawData.width || 60, 30);
  const height = Math.max(drawData.height || 40, 20);

  const { updateNodeData, deleteElements } = useReactFlow();

  const handleColorChange = useCallback(
    (c: string) => {
      updateNodeData(id, { strokeColor: c });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div className="relative group w-full h-full min-w-[30px] min-h-[20px]">
      <NodeResizer
        isVisible={selected}
        minWidth={30}
        minHeight={20}
        lineClassName="!border-indigo-400 !border-dashed"
        handleClassName="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white !rounded-sm hover:!bg-indigo-400"
      />

      {/* Floating Toolbar on Selection */}
      {selected && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-3 h-3 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                  strokeColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-[1px] h-3 bg-slate-700" />
          <button
            onClick={handleDelete}
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Delete drawing (Delete / Backspace)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* SVG Canvas Stroke */}
      <svg
        className={`w-full h-full overflow-visible transition-opacity ${
          selected ? 'filter drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]' : ''
        }`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path
          d={drawData.path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
