import React, { useState, useEffect, useCallback } from 'react';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { authService, type UserProfile } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Security: completely reset form inputs and errors whenever modal opens or closes
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setPassword('');
    setError(null);
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setPassword('');
    setError(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await authService.login(email, password);
      } else {
        res = await authService.register(email, password, name || undefined);
      }
      resetForm();
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Authentication failed. Please check your credentials or ensure the server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d121f] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isLogin ? 'Sign in to System Design Studio' : 'Create Engineer Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {isLogin
                ? 'Save architectures, versions, and share models'
                : 'Free account with cloud saving and AI review'}
            </p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={switchToLogin}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isLogin ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={switchToRegister}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isLogin ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form with security auto-complete policies */}
        <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name (Optional)
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="off"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                autoComplete={isLogin ? 'username' : 'off'}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
