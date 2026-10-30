import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

interface AccessDeniedModalProps {
  isOpen: boolean;
  statusCode: 401 | 403 | 404;
  title: string;
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionText?: string;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  statusCode,
  title,
  message,
  onClose,
  onAction,
  actionText,
}) => {
  if (!isOpen) return null;

  const is403 = statusCode === 403;
  const is401 = statusCode === 401;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d121f] p-6 shadow-2xl text-center">
        {/* Icon */}
        <div className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
          is403
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/10'
            : is401
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/10'
            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
        }`}>
          <ShieldAlert size={28} />
        </div>

        {/* Status Badge */}
        <div className="mb-2">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
            is403
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              : is401
              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 text-slate-300'
          }`}>
            HTTP {statusCode} {is403 ? 'FORBIDDEN' : is401 ? 'UNAUTHORIZED' : 'NOT FOUND'}
          </span>
        </div>

        {/* Title & Message */}
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-sm mx-auto">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Default Canvas</span>
          </button>

          {onAction && (
            <button
              onClick={onAction}
              className={`flex-1 py-2 px-3.5 rounded-xl text-white text-xs font-semibold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                is401
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/20'
              }`}
            >
              {is401 ? <LogIn size={14} /> : null}
              <span>{actionText || (is401 ? 'Sign In Now' : 'My Projects')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
