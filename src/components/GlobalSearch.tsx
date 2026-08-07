'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Target, Users, Building2, X, Command } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface SearchResults {
  leads: Array<{ id: string; title: string; stage: string; company?: { name: string } | null; contact?: { firstName: string; lastName: string } | null }>;
  contacts: Array<{ id: string; firstName: string; lastName: string; email?: string | null; company?: { name: string } | null }>;
  companies: Array<{ id: string; name: string; industry?: string | null }>;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/crm/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const totalResults = results ? results.leads.length + results.contacts.length + results.companies.length : 0;

  const stageBadge: Record<string, string> = {
    NEW: 'bg-blue-500/20 text-blue-400',
    QUALIFIED: 'bg-purple-500/20 text-purple-400',
    PROPOSAL: 'bg-amber-500/20 text-amber-400',
    WON: 'bg-emerald-500/20 text-emerald-400',
    LOST: 'bg-red-500/20 text-red-400',
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              placeholder="Search leads, contacts, companies..."
            />
            {loading && <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />}
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          {results && query.length >= 2 && (
            <div className="max-h-[400px] overflow-y-auto">
              {totalResults === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                <>
                  {results.leads.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Leads</p>
                      {results.leads.map(l => (
                        <button key={l.id} onClick={() => navigate(`/dashboard/leads/${l.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0"><Target className="w-3.5 h-3.5 text-blue-400" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{l.title}</p>
                            <p className="text-xs text-gray-500 truncate">{l.company?.name || l.contact?.firstName}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stageBadge[l.stage] || 'bg-gray-500/20 text-gray-400'}`}>{l.stage}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.contacts.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Contacts</p>
                      {results.contacts.map(c => (
                        <button key={c.id} onClick={() => navigate(`/dashboard/contacts/${c.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0"><Users className="w-3.5 h-3.5 text-purple-400" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-500 truncate">{c.email || c.company?.name || ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.companies.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Companies</p>
                      {results.companies.map(c => (
                        <button key={c.id} onClick={() => navigate(`/dashboard/companies/${c.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5 text-emerald-400" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{c.name}</p>
                            <p className="text-xs text-gray-500 truncate">{c.industry || ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">↵</kbd> to select
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">esc</kbd> to close
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Command className="w-3 h-3" /><span>K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
