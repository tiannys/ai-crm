'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Building2, User } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Portal from '@/components/Portal';

interface LeadFormModalProps {
  open: boolean;
  leadId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  title: string;
  stage: string;
  source: string;
  value: string;
  notes: string;
  expectedClose: string;
  companyId: string;
  contactId: string;
}

interface CompanyOption { id: string; name: string; }
interface ContactOption { id: string; firstName: string; lastName: string; companyId: string | null; }

const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const sources = ['MANUAL', 'WEBSITE', 'LINE'];

export default function LeadFormModal({ open, leadId, onClose, onSaved }: LeadFormModalProps) {
  const isEdit = !!leadId;
  const [form, setForm] = useState<FormData>({
    title: '', stage: 'NEW', source: 'MANUAL', value: '', notes: '', expectedClose: '',
    companyId: '', contactId: '',
  });
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Fetch companies & contacts for dropdowns
  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch('/api/crm/companies').then(r => r.json()),
      apiFetch('/api/crm/contacts').then(r => r.json()),
    ]).then(([compData, contData]) => {
      setCompanies(Array.isArray(compData) ? compData : compData.data || []);
      const contactList = Array.isArray(contData) ? contData : contData.data || [];
      setContacts(contactList.map((c: any) => ({
        id: c.id, firstName: c.firstName, lastName: c.lastName,
        companyId: c.companyId || c.company?.id || null,
      })));
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setFetching(true);
      apiFetch(`/api/crm/leads/${leadId}`).then(r => r.json()).then(lead => {
        setForm({
          title: lead.title || '',
          stage: lead.stage || 'NEW',
          source: lead.source || 'MANUAL',
          value: lead.value ? String(Number(lead.value)) : '',
          notes: lead.notes || '',
          expectedClose: lead.expectedClose ? lead.expectedClose.split('T')[0] : '',
          companyId: lead.companyId || lead.company?.id || '',
          contactId: lead.contactId || lead.contact?.id || '',
        });
      }).finally(() => setFetching(false));
    } else {
      setForm({ title: '', stage: 'NEW', source: 'MANUAL', value: '', notes: '', expectedClose: '', companyId: '', contactId: '' });
    }
    setError('');
  }, [open, leadId, isEdit]);

  if (!open) return null;

  // When Contact changes, auto-fill Company
  const handleContactChange = (contactId: string) => {
    setForm(f => {
      const newForm = { ...f, contactId };
      if (contactId) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact?.companyId) {
          newForm.companyId = contact.companyId;
        }
      }
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        stage: form.stage,
        source: form.source,
        notes: form.notes || null,
        expectedClose: form.expectedClose || null,
        companyId: form.companyId || null,
        contactId: form.contactId || null,
      };
      if (form.value) body.value = parseFloat(form.value);

      const res = await apiFetch(`/api/crm/leads${isEdit ? `/${leadId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inputClass = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold text-white mb-5">{isEdit ? 'Edit Lead' : 'Create Lead'}</h3>

        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Title *</label>
              <input value={form.title} onChange={set('title')} className={inputClass} placeholder="e.g., Website Redesign Project" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Stage</label>
                <select value={form.stage} onChange={set('stage')} className={inputClass}>
                  {stages.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select value={form.source} onChange={set('source')} className={inputClass}>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Contact + Company with auto-fill */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}><User className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Contact</label>
                <select value={form.contactId} onChange={e => handleContactChange(e.target.value)} className={inputClass}>
                  <option value="">— None —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}><Building2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Company</label>
                <select value={form.companyId} onChange={set('companyId')} className={inputClass}>
                  <option value="">— None —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Value (฿)</label>
                <input type="number" value={form.value} onChange={set('value')} className={inputClass} placeholder="e.g., 500000" min="0" />
              </div>
              <div>
                <label className={labelClass}>Expected Close</label>
                <input type="date" value={form.expectedClose} onChange={set('expectedClose')} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} className={`${inputClass} resize-none`} placeholder="Additional details..." />
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Create Lead'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </Portal>
  );
}
