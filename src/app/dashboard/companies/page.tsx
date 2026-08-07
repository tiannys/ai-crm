'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Building2, Users, Target, Globe, Phone, Edit3, Trash2, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import CompanyFormModal from '@/components/modals/CompanyFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  _count: { contacts: number; leads: number };
}

interface CompaniesResponse {
  data: Company[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    try {
      const res = await apiFetch(`/api/crm/companies?${params}`);
      setCompanies(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(t);
  }, [fetchCompanies]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/crm/companies/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchCompanies();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Companies</h1>
          <p className="text-sm text-gray-500">{companies?.total || 0} companies</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25">
          <Plus className="w-4 h-4" /> New Company
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : companies?.data.length === 0 ? (
        <div className="text-center py-16 text-gray-500 glass-card">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies?.data.map(c => (
            <div key={c.id} className="glass-card p-5 space-y-3 hover:border-purple-500/20 transition-all group relative">
              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.preventDefault(); setEditId(c.id); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Edit">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button onClick={e => { e.preventDefault(); setDeleteTarget(c); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <Link href={`/dashboard/companies/${c.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">{c.name}</p>
                    {c.industry && <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 mt-1">{c.industry}</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                </div>

                <div className="space-y-1.5 mt-3">
                  {c.website && <p className="text-xs text-gray-400 flex items-center gap-2 truncate"><Globe className="w-3 h-3 flex-shrink-0" /> {c.website}</p>}
                  {c.phone && <p className="text-xs text-gray-400 flex items-center gap-2"><Phone className="w-3 h-3 flex-shrink-0" /> {c.phone}</p>}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-white/5 mt-3">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {c._count.contacts} contacts</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" /> {c._count.leads} leads</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CompanyFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchCompanies} />
      <CompanyFormModal open={!!editId} companyId={editId} onClose={() => setEditId(null)} onSaved={fetchCompanies} />
      <ConfirmDialog open={!!deleteTarget} title="Delete Company"
        message={`This will permanently delete "${deleteTarget?.name || ''}" and unlink all associated contacts and leads.`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
