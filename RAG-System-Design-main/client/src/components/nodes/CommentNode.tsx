import { memo, useState, useCallback } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import { MessageSquare, Trash2, User } from 'lucide-react';

export interface CommentNodeData {
  author?: string;
  text?: string;
  color?: string;
  isAnnotation?: boolean;
}

export const CommentNode = memo(({ id, data, selected }: NodeProps) => {
  const commentData = data as unknown as CommentNodeData;
  const author = commentData.author || 'Architect';
  const text = commentData.text || 'Review system latency & failover SLA.';
  const color = commentData.color || '#f59e0b';

  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState(text);

  const { updateNodeData, deleteElements } = useReactFlow();

  const handleSave = useCallback(() => {
    setIsEditing(false);
    updateNodeData(id, { text: commentText });
  }, [id, commentText, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div className="relative group w-full h-full min-w-[140px] min-h-[90px]">
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={90}
        lineClassName="!border-amber-400 !border-dashed"
        handleClassName="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-sm hover:!bg-amber-400"
      />

      {/* Floating Toolbar on Selection */}
      {selected && (
        <div
          className="absolute -top-9 right-2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2 py-1 shadow-2xl flex items-center gap-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Delete comment (Delete / Backspace)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Sticky Note Card */}
      <div
        className={`w-full h-full rounded-xl border p-3 flex flex-col justify-between shadow-xl backdrop-blur-xl transition-all ${
          selected ? 'ring-2 ring-amber-400/80 shadow-amber-500/20' : ''
        }`}
        style={{
          backgroundColor: '#1c1917ee',
          borderColor: `${color}60`,
        }}
      >
        {/* Header with Author */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-2 select-none">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
            <MessageSquare size={12} />
            <span className="truncate">{author}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>

        {/* Comment Content */}
        <div className="flex-1 overflow-hidden" onDoubleClick={() => setIsEditing(true)}>
          {isEditing ? (
            <textarea
              value={commentText}
              autoFocus
              onChange={(e) => setCommentText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full h-full bg-transparent border-none outline-none text-xs text-slate-200 resize-none leading-relaxed"
            />
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed break-words line-clamp-4 select-none cursor-pointer">
              {commentText}
            </p>
          )}
        </div>

        {/* Card Footer */}
        <div className="pt-1 text-[10px] text-slate-500 font-mono flex items-center justify-between select-none">
          <span>Design Note</span>
          <User size={10} />
        </div>
      </div>
    </div>
  );
});
