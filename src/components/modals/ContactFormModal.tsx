'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Portal from '@/components/Portal';

interface ContactFormModalProps {
  open: boolean;
  contactId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  companyId: string;
  notes: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

export default function ContactFormModal({ open, contactId, onClose, onSaved }: ContactFormModalProps) {
  const isEdit = !!contactId;
  const [form, setForm] = useState<FormData>({ firstName: '', lastName: '', email: '', phone: '', position: '', companyId: '', notes: '' });
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Fetch companies list for dropdown
  useEffect(() => {
    if (!open) return;
    apiFetch('/api/crm/companies')
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setFetching(true);
      apiFetch(`/api/crm/contacts/${contactId}`).then(r => r.json()).then(c => {
        setForm({
          firstName: c.firstName || '', lastName: c.lastName || '',
          email: c.email || '', phone: c.phone || '', position: c.position || '',
          companyId: c.companyId || c.company?.id || '',
          notes: c.notes || '',
        });
      }).finally(() => setFetching(false));
    } else {
      setForm({ firstName: '', lastName: '', email: '', phone: '', position: '', companyId: '', notes: '' });
    }
    setError('');
  }, [open, contactId, isEdit]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required'); return; }
    setLoading(true);

    try {
      const res = await apiFetch(`/api/crm/contacts${isEdit ? `/${contactId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email || null,
          phone: form.phone || null,
          position: form.position || null,
          companyId: form.companyId || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inputClass = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all';

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-semibold text-white mb-5">{isEdit ? 'Edit Contact' : 'Create Contact'}</h3>
        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">First Name *</label><input value={form.firstName} onChange={set('firstName')} className={inputClass} required /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Last Name *</label><input value={form.lastName} onChange={set('lastName')} className={inputClass} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input type="email" value={form.email} onChange={set('email')} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={form.phone} onChange={set('phone')} className={inputClass} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Position</label><input value={form.position} onChange={set('position')} className={inputClass} /></div>
            {/* Company Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Company
              </label>
              <select value={form.companyId} onChange={set('companyId')} className={inputClass}>
                <option value="">— No company —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Notes</label><textarea value={form.notes} onChange={set('notes')} rows={2} className={`${inputClass} resize-none`} /></div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Create Contact'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </Portal>
  );
}
