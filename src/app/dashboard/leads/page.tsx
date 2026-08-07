'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  Building2, User, X, Target, LayoutGrid, List, Trash2, Edit3, Users,
} from 'lucide-react';
import { formatCurrency, formatDate, getStageColor, getSourceIcon } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import KanbanBoard from '@/components/KanbanBoard';
import LeadFormModal from '@/components/modals/LeadFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface FilterOption { id: string; name: string; }

interface Lead {
  id: string;
  title: string;
  stage: string;
  value: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  company: { name: string } | null;
  contact: { firstName: string; lastName: string; lineUserId?: string | null } | null;
  owner: { name: string };
  aiScore?: number | null;
  _count: { activities: number; messages: number };
}

interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const stages = ['ALL', 'NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // for Kanban (no pagination)
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filter options
  const [companyOptions, setCompanyOptions] = useState<FilterOption[]>([]);
  const [contactOptions, setContactOptions] = useState<FilterOption[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<FilterOption[]>([]);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  // Fetch filter options once
  useEffect(() => {
    Promise.all([
      apiFetch('/api/crm/companies').then(r => r.json()),
      apiFetch('/api/crm/contacts').then(r => r.json()),
    ]).then(([compData, contData]) => {
      const comps = Array.isArray(compData) ? compData : compData.data || [];
      setCompanyOptions(comps.map((c: any) => ({ id: c.id, name: c.name })));
      const conts = Array.isArray(contData) ? contData : contData.data || [];
      setContactOptions(conts.map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
      // Extract unique owners from contacts/leads - we'll get from leads data
    }).catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (companyFilter) params.set('companyId', companyFilter);
      if (contactFilter) params.set('contactId', contactFilter);
      if (ownerFilter) params.set('ownerId', ownerFilter);

      if (viewMode === 'kanban') {
        params.set('limit', '200');
        const res = await apiFetch(`/api/crm/leads?${params}`);
        const data = await res.json();
        setAllLeads(data.data || []);
        setLeads(data);
        // Extract unique owners for filter
        const owners = new Map<string, string>();
        (data.data || []).forEach((l: any) => { if (l.owner) owners.set(l.owner.id, l.owner.name); });
        setOwnerOptions(prev => prev.length > 0 ? prev : Array.from(owners, ([id, name]) => ({ id, name })));
      } else {
        if (stageFilter !== 'ALL') params.set('stage', stageFilter);
        params.set('page', page.toString());
        params.set('limit', '20');
        const res = await apiFetch(`/api/crm/leads?${params}`);
        const data = await res.json();
        setLeads(data);
        // Extract unique owners
        const owners = new Map<string, string>();
        (data.data || []).forEach((l: any) => { if (l.owner) owners.set(l.owner.id, l.owner.name); });
        setOwnerOptions(prev => prev.length > 0 ? prev : Array.from(owners, ([id, name]) => ({ id, name })));
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, companyFilter, contactFilter, ownerFilter, page, viewMode]);

  useEffect(() => {
    const debounce = setTimeout(fetchLeads, 300);
    return () => clearTimeout(debounce);
  }, [fetchLeads]);

  const handleDelete = async () => {
    if (!deleteLeadId) return;
    try {
      await apiFetch(`/api/crm/leads/${deleteLeadId}`, { method: 'DELETE' });
      setDeleteLeadId(null);
      fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-500">{leads?.total || 0} total leads in pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg">
            <button onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Kanban View">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="List View">
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search leads, companies, contacts..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Dropdown Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 min-w-[130px]">
              <option value="">🏢 All Companies</option>
              {companyOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={contactFilter} onChange={e => { setContactFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 min-w-[130px]">
              <option value="">👤 All Contacts</option>
              {contactOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={ownerFilter} onChange={e => { setOwnerFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 min-w-[120px]">
              <option value="">👥 All Owners</option>
              {ownerOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {(companyFilter || contactFilter || ownerFilter) && (
              <button onClick={() => { setCompanyFilter(''); setContactFilter(''); setOwnerFilter(''); setPage(1); }}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        {viewMode === 'list' && (
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500 mr-1" />
            {stages.map(s => (
              <button key={s} onClick={() => { setStageFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  stageFilter === s
                    ? s === 'ALL' ? 'bg-white/10 text-white' : `stage-${s.toLowerCase()}`
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(5)].map((_, i) => <div key={i} className="flex-shrink-0 w-[280px] skeleton h-80 rounded-2xl" />)}
          </div>
        ) : (
          <KanbanBoard leads={allLeads} onRefresh={fetchLeads} />
        )
      ) : (
        /* List View */
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 m-0" style={{ borderRadius: 0 }} />)}
            </div>
          ) : leads?.data.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Contact</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Owner</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads?.data.map(lead => (
                    <tr key={lead.id} className="hover:bg-white/3 transition-colors group">
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/leads/${lead.id}`} className="block">
                          <div className="flex items-center gap-3">
                            <span className="text-sm">{getSourceIcon(lead.source)}</span>
                            <div>
                              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{lead.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 md:hidden">{lead.company?.name || 'No company'}</p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`stage-${lead.stage.toLowerCase()} px-2.5 py-1 rounded-md text-xs font-medium`}>{lead.stage}</span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Building2 className="w-3.5 h-3.5" /> {lead.company?.name || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="w-3.5 h-3.5" /> {lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName}` : '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-medium text-white">{lead.value ? formatCurrency(lead.value) : '—'}</span>
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell text-sm text-gray-400">{lead.owner.name}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditLeadId(lead.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteLeadId(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {leads && leads.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {leads.page} of {leads.totalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(leads.totalPages, page + 1))} disabled={page === leads.totalPages} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LeadFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchLeads} />
      <LeadFormModal open={!!editLeadId} leadId={editLeadId} onClose={() => setEditLeadId(null)} onSaved={fetchLeads} />
      <ConfirmDialog open={!!deleteLeadId} title="Delete Lead" message="This will permanently delete this lead and all its activities. This action cannot be undone."
        onConfirm={handleDelete} onCancel={() => setDeleteLeadId(null)} />
    </div>
  );
}
