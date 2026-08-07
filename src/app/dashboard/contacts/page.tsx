'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Building2, Mail, Phone, MessageCircle, Target, User, Edit3, Trash2, X, FileDown } from 'lucide-react';
import { apiFetch, getCurrentUserRole } from '@/lib/api';
import ContactFormModal from '@/components/modals/ContactFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  lineUserId: string | null;
  lineDisplayName: string | null;
  company: { name: string } | null;
  _count: { leads: number; messages: number };
}

interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companyOptions, setCompanyOptions] = useState<{id: string; name: string}[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  // Fetch company options once
  useEffect(() => {
    apiFetch('/api/crm/companies').then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCompanyOptions(list.map((c: any) => ({ id: c.id, name: c.name })));
      }).catch(() => {});
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (companyFilter) params.set('companyId', companyFilter);
    try {
      const res = await apiFetch(`/api/crm/contacts?${params}`);
      setContacts(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, companyFilter]);

  useEffect(() => {
    const t = setTimeout(fetchContacts, 300);
    return () => clearTimeout(t);
  }, [fetchContacts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/crm/contacts/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchContacts();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-gray-500">{contacts?.total || 0} contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            const res = await apiFetch('/api/export/contacts');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `contacts_${new Date().toISOString().slice(0,10)}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-all" title="Export CSV">
            <FileDown className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4" /> New Contact
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div className="flex gap-2">
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 min-w-[140px]">
              <option value="">🏢 All Companies</option>
              {companyOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {companyFilter && (
              <button onClick={() => setCompanyFilter('')}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : contacts?.data.length === 0 ? (
        <div className="text-center py-16 text-gray-500 glass-card">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts?.data.map(c => (
            <div key={c.id} className="glass-card p-5 space-y-3 hover:border-blue-500/20 transition-all group relative cursor-pointer"
              onClick={() => router.push(`/dashboard/contacts/${c.id}`)}>
              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); setEditId(c.id); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Edit">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                    {c.firstName} {c.lastName}
                  </p>
                  {c.position && <p className="text-xs text-gray-500 mt-0.5">{c.position}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                {c.company && <p className="text-xs text-gray-400 flex items-center gap-2"><Building2 className="w-3 h-3 flex-shrink-0" /> {c.company.name}</p>}
                {c.email && <p className="text-xs text-gray-400 flex items-center gap-2"><Mail className="w-3 h-3 flex-shrink-0" /> {c.email}</p>}
                {c.phone && <p className="text-xs text-gray-400 flex items-center gap-2"><Phone className="w-3 h-3 flex-shrink-0" /> {c.phone}</p>}
                {c.lineUserId && (
                  <p className="text-xs text-emerald-400 flex items-center gap-2">
                    <MessageCircle className="w-3 h-3 flex-shrink-0" />
                    {c.lineDisplayName || 'LINE Connected'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" /> {c._count.leads} leads</span>
                <span className="text-xs text-gray-500 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {c._count.messages} msgs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ContactFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchContacts} />
      <ContactFormModal open={!!editId} contactId={editId} onClose={() => setEditId(null)} onSaved={fetchContacts} />
      <ConfirmDialog open={!!deleteTarget} title="Delete Contact"
        message={`This will permanently delete "${deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : ''}" and unlink all associated leads.`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
