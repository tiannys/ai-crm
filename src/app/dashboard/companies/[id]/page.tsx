'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Users, Target, Globe, Phone, MapPin,
  Edit3, Trash2, ChevronRight, Mail, Notebook,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import CompanyFormModal from '@/components/modals/CompanyFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface CompanyDetail {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  contacts: Array<{
    id: string; firstName: string; lastName: string;
    email: string | null; phone: string | null; position: string | null;
    _count: { leads: number; messages: number };
  }>;
  leads: Array<{
    id: string; title: string; stage: string; value: string | null; source: string;
    contact: { firstName: string; lastName: string } | null;
    owner: { name: string };
  }>;
  _count: { contacts: number; leads: number };
}

const stageBadge: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400', QUALIFIED: 'bg-purple-500/20 text-purple-400',
  PROPOSAL: 'bg-amber-500/20 text-amber-400', WON: 'bg-emerald-500/20 text-emerald-400',
  LOST: 'bg-red-500/20 text-red-400',
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchCompany = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/crm/companies/${params.id}`);
      if (res.ok) setCompany(await res.json());
      else router.push('/dashboard/companies');
    } catch {
      router.push('/dashboard/companies');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/crm/companies/${params.id}`, { method: 'DELETE' });
      router.push('/dashboard/companies');
    } catch (err) { console.error('Failed to delete company:', err); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-60 rounded-2xl" />
          <div className="skeleton h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!company) return null;

  const pipelineValue = company.leads.reduce((sum, l) => sum + (l.value ? Number(l.value) : 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push('/dashboard/companies')} className="mt-1 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold">
              {company.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{company.name}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {company.industry && <span>{company.industry}</span>}
                <span>{company._count.contacts} contacts</span>
                <span>{company._count.leads} leads</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Edit"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => setShowDelete(true)} className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-white">{company._count.contacts}</p><p className="text-xs text-gray-500 mt-1">Contacts</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-white">{company._count.leads}</p><p className="text-xs text-gray-500 mt-1">Leads</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-emerald-400">฿{pipelineValue.toLocaleString()}</p><p className="text-xs text-gray-500 mt-1">Pipeline Value</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-white">{company.leads.filter(l => l.stage === 'WON').length}</p><p className="text-xs text-gray-500 mt-1">Deals Won</p></div>
      </div>

      {/* Company Info */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Company Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {company.website && (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Globe className="w-4 h-4 text-gray-500" />
              <a href={company.website} target="_blank" rel="noopener" className="text-blue-400 hover:underline">{company.website}</a>
            </div>
          )}
          {company.phone && <div className="flex items-center gap-2 text-sm text-gray-400"><Phone className="w-4 h-4 text-gray-500" /> {company.phone}</div>}
          {company.address && <div className="flex items-center gap-2 text-sm text-gray-400"><MapPin className="w-4 h-4 text-gray-500" /> {company.address}</div>}
          {company.notes && <div className="flex items-start gap-2 text-sm text-gray-400 md:col-span-2"><Notebook className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" /> {company.notes}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4" /> Contacts</h3>
          </div>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No contacts</p>
          ) : (
            <div className="space-y-2">
              {company.contacts.map(c => (
                <Link key={c.id} href={`/dashboard/contacts/${c.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-blue-400 transition-colors">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-500">{c.position || c.email || ''}</p>
                  </div>
                  <div className="text-xs text-gray-500">{c._count.leads} leads</div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Leads */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Target className="w-4 h-4" /> Leads</h3>
          </div>
          {company.leads.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No leads</p>
          ) : (
            <div className="space-y-2">
              {company.leads.map(lead => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-blue-400 transition-colors">{lead.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stageBadge[lead.stage] || 'bg-gray-500/20 text-gray-400'}`}>{lead.stage}</span>
                      {lead.value && <span className="text-xs text-gray-500">฿{Number(lead.value).toLocaleString()}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CompanyFormModal open={showEdit} companyId={company.id} onClose={() => setShowEdit(false)} onSaved={fetchCompany} />
      <ConfirmDialog open={showDelete} title="Delete Company" message={`This will permanently delete "${company.name}" and unlink all associated contacts and leads.`}
        onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
