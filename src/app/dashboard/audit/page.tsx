'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScrollText, Filter, ChevronLeft, ChevronRight, Loader2,
  LogIn, LogOut, Plus, Edit3, Trash2, UserX, UserCheck,
  Target, Users, Building2, Shield, FileDown,
} from 'lucide-react';
import { apiGet } from '@/lib/api';

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionIcons: Record<string, typeof LogIn> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  CREATE: Plus,
  UPDATE: Edit3,
  DELETE: Trash2,
  DISABLE: UserX,
  ENABLE: UserCheck,
};

const actionColors: Record<string, string> = {
  LOGIN: 'text-emerald-400 bg-emerald-500/10',
  LOGOUT: 'text-gray-400 bg-gray-500/10',
  CREATE: 'text-blue-400 bg-blue-500/10',
  UPDATE: 'text-amber-400 bg-amber-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
  DISABLE: 'text-orange-400 bg-orange-500/10',
  ENABLE: 'text-emerald-400 bg-emerald-500/10',
};

const entityIcons: Record<string, typeof Target> = {
  LEAD: Target,
  CONTACT: Users,
  COMPANY: Building2,
  USER: Shield,
  AUTH: LogIn,
  EXPORT: FileDown,
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    apiGet<{ user: { role: string } }>('/api/auth/me')
      .then((data) => {
        if (data.user.role !== 'ADMIN') { router.push('/dashboard'); return; }
        setCurrentUser(data.user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (filterEntity) params.set('entity', filterEntity);
      if (filterAction) params.set('action', filterAction);

      const data = await apiGet<{ data: AuditEntry[]; totalPages: number }>(`/api/audit?${params}`);
      setLogs(data.data);
      setTotalPages(data.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchLogs();
  }, [currentUser, page, filterEntity, filterAction]);

  if (!currentUser) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-amber-400" />
            Audit Log
          </h1>
          <p className="text-sm text-gray-400 mt-1">Track all system actions and changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All Entities</option>
          <option value="AUTH">Auth</option>
          <option value="LEAD">Lead</option>
          <option value="CONTACT">Contact</option>
          <option value="COMPANY">Company</option>
          <option value="USER">User</option>
          <option value="EXPORT">Export</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="DISABLE">Disable</option>
          <option value="ENABLE">Enable</option>
        </select>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No audit logs found</p>
        </div>
      ) : (
        <div className="bg-[hsl(0,0%,10%)] border border-white/5 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {logs.map((entry) => {
              const ActionIcon = actionIcons[entry.action] || Edit3;
              const EntityIcon = entityIcons[entry.entity] || Target;
              const colorClass = actionColors[entry.action] || 'text-gray-400 bg-gray-500/10';

              return (
                <div key={entry.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  {/* Action Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <ActionIcon className="w-4 h-4" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-white">{entry.userName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{entry.action}</span>
                      <EntityIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-400">{entry.entity}</span>
                      {entry.entityId && (
                        <span className="text-xs text-gray-600 font-mono">{entry.entityId.slice(0, 8)}…</span>
                      )}
                    </div>
                    {entry.details && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xl">
                        {JSON.stringify(entry.details)}
                      </p>
                    )}
                  </div>

                  {/* IP */}
                  <span className="text-xs text-gray-600 font-mono hidden lg:block">
                    {entry.ipAddress || '—'}
                  </span>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(entry.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
