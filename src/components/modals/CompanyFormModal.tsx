'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface CompanyFormModalProps {
  open: boolean;
  companyId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  notes: string;
}

export default function CompanyFormModal({ open, companyId, onClose, onSaved }: CompanyFormModalProps) {
  const isEdit = !!companyId;
  const [form, setForm] = useState<FormData>({ name: '', industry: '', website: '', phone: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setFetching(true);
      apiFetch(`/api/crm/companies/${companyId}`).then(r => r.json()).then(c => {
        setForm({ name: c.name || '', industry: c.industry || '', website: c.website || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
      }).finally(() => setFetching(false));
    } else {
      setForm({ name: '', industry: '', website: '', phone: '', address: '', notes: '' });
    }
    setError('');
  }, [open, companyId, isEdit]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setLoading(true);

    try {
      const res = await apiFetch(`/api/crm/companies${isEdit ? `/${companyId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          industry: form.industry || null,
          website: form.website || null,
          phone: form.phone || null,
          address: form.address || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inputClass = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-semibold text-white mb-5">{isEdit ? 'Edit Company' : 'Create Company'}</h3>
        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name *</label><input value={form.name} onChange={set('name')} className={inputClass} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Industry</label><input value={form.industry} onChange={set('industry')} className={inputClass} placeholder="e.g., Technology" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={form.phone} onChange={set('phone')} className={inputClass} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label><input value={form.website} onChange={set('website')} className={inputClass} placeholder="https://..." /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Address</label><input value={form.address} onChange={set('address')} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Notes</label><textarea value={form.notes} onChange={set('notes')} rows={3} className={`${inputClass} resize-none`} /></div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Create Company'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
