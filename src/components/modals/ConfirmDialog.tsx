'use client';

import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'red' | 'blue';
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', confirmColor = 'red',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };

  const btnClass = confirmColor === 'red'
    ? 'bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
    : 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-6 w-full max-w-sm animate-fade-in" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading} className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 ${btnClass}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
