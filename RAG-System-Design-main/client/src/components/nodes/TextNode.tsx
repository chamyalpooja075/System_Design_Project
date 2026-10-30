import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import { Bold, Trash2, Plus, Minus } from 'lucide-react';

export interface TextNodeData {
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  color?: string;
  isAnnotation?: boolean;
}

const TEXT_COLORS = [
  { name: 'White', hex: '#f8fafc' },
  { name: 'Slate', hex: '#94a3b8' },
  { name: 'Indigo', hex: '#818cf8' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Emerald', hex: '#34d399' },
  { name: 'Amber', hex: '#fbbf24' },
  { name: 'Rose', hex: '#fb7185' },
];

export const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const textData = data as unknown as TextNodeData;
  const fontSize = textData.fontSize || 16;
  const isBold = !!textData.isBold;
  const color = textData.color || '#f8fafc';
  const text = textData.text !== undefined ? textData.text : 'Double-click to edit text';

  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { updateNodeData, deleteElements } = useReactFlow();

  useEffect(() => {
    setCurrentText(text);
  }, [text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleFontSizeChange = useCallback(
    (delta: number) => {
      const nextSize = Math.max(10, Math.min(72, fontSize + delta));
      updateNodeData(id, { fontSize: nextSize });
    },
    [id, fontSize, updateNodeData]
  );

  const handleBoldToggle = useCallback(() => {
    updateNodeData(id, { isBold: !isBold });
  }, [id, isBold, updateNodeData]);

  const handleColorChange = useCallback(
    (hex: string) => {
      updateNodeData(id, { color: hex });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const handleFinishEditing = useCallback(() => {
    setIsEditing(false);
    updateNodeData(id, { text: currentText });
  }, [id, currentText, updateNodeData]);

  return (
    <div className="relative group min-w-[60px] min-h-[30px]">
      {/* Interactive Resizer */}
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={30}
        lineClassName="!border-indigo-400 !border-dashed"
        handleClassName="!w-2 !h-2 !bg-indigo-500 !border !border-white !rounded-sm hover:!bg-indigo-400"
      />

      {/* Floating Text Formatting Toolbar on Selection */}
      {selected && (
        <div
          className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Font Size Decrease */}
          <button
            onClick={() => handleFontSizeChange(-2)}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Decrease font size (A-)"
          >
            <Minus size={12} />
          </button>

          {/* Current Font Size Indicator */}
          <span className="text-[11px] font-mono text-indigo-300 px-1 font-semibold">
            {fontSize}px
          </span>

          {/* Font Size Increase */}
          <button
            onClick={() => handleFontSizeChange(2)}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Increase font size (A+)"
          >
            <Plus size={12} />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Bold Toggle */}
          <button
            onClick={handleBoldToggle}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer font-bold text-xs ${
              isBold 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Bold formatting"
          >
            <Bold size={12} />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Text Color Presets */}
          <div className="flex items-center gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => handleColorChange(c.hex)}
                className={`w-3 h-3 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                  color === c.hex ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : ''
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Delete text (Delete / Backspace)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Rendered Text or Textarea */}
      <div
        className={`w-full h-full p-2 rounded-lg transition-all ${
          selected ? 'ring-1 ring-indigo-400/80 bg-slate-900/40' : 'hover:bg-slate-900/20'
        }`}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className="w-full h-full min-h-[40px] bg-transparent border-none outline-none resize-none p-0 overflow-hidden leading-snug"
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: isBold ? 700 : 400,
              color: color,
              lineHeight: 1.3,
            }}
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words leading-snug select-none cursor-pointer"
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: isBold ? 700 : 400,
              color: color,
              lineHeight: 1.3,
            }}
          >
            {currentText || <span className="opacity-40 italic">Type text...</span>}
          </div>
        )}
      </div>
    </div>
  );
});
