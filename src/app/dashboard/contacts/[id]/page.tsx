'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MessageCircle, Target, Building2, Mail, Phone,
  Plus, Send, Bot, Clock, ChevronRight, User, Edit3, Trash2,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ContactFormModal from '@/components/modals/ContactFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface Message {
  id: string;
  channel: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  status: string;
  createdAt: string;
  metadata: any;
}

interface Lead {
  id: string;
  title: string;
  stage: string;
  source: string;
  value: number | null;
  owner: { name: string };
  updatedAt: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  lineUserId: string | null;
  lineDisplayName: string | null;
  company: { name: string } | null;
  leads: Lead[];
  messages: Message[];
}

const stageBadge: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400',
  QUALIFIED: 'bg-purple-500/20 text-purple-400',
  PROPOSAL: 'bg-amber-500/20 text-amber-400',
  WON: 'bg-emerald-500/20 text-emerald-400',
  LOST: 'bg-red-500/20 text-red-400',
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [leadTitle, setLeadTitle] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Chat state
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchContact = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/crm/contacts/${params.id}`);
      if (res.ok) setContact(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contact?.messages]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !contact?.lineUserId) return;
    setSending(true);
    try {
      const res = await apiFetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, content: replyText }),
      });
      if (res.ok) {
        setReplyText('');
        fetchContact(); // Refresh messages
      }
    } catch (err) { console.error('Failed to send:', err); }
    finally { setSending(false); }
  };

  const handleCreateLead = async () => {
    if (!contact) return;
    setCreating(true);
    try {
      const res = await apiFetch(`/api/crm/contacts/${contact.id}/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: leadTitle || `LINE Inquiry - ${contact.firstName} ${contact.lastName}`,
          source: contact.lineUserId ? 'LINE' : 'MANUAL',
        }),
      });
      if (res.ok) {
        const lead = await res.json();
        router.push(`/dashboard/leads/${lead.id}`);
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await apiFetch(`/api/crm/contacts/${contact.id}`, { method: 'DELETE' });
      router.push('/dashboard/contacts');
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-60 rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-16 glass-card">
        <User className="w-12 h-12 mx-auto mb-3 text-gray-500 opacity-30" />
        <p className="text-gray-500 text-sm">Contact not found</p>
      </div>
    );
  }

  const hasLine = !!contact.lineUserId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/contacts')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{contact.firstName} {contact.lastName}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {hasLine && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <MessageCircle className="w-3 h-3" /> LINE Connected
                  </span>
                )}
                {contact.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {contact.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Edit">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => setShowDelete(true)}
            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar: Contact Info + Leads */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Contact Info</h3>
            <div className="space-y-2.5">
              {contact.position && (
                <p className="text-sm text-gray-400 flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> {contact.position}</p>
              )}
              {contact.email && (
                <p className="text-sm text-gray-400 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500" /> {contact.email}</p>
              )}
              {contact.phone && (
                <p className="text-sm text-gray-400 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500" /> {contact.phone}</p>
              )}
              {contact.lineDisplayName && (
                <p className="text-sm text-emerald-400 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {contact.lineDisplayName}</p>
              )}
              {!contact.email && !contact.phone && !contact.position && !contact.lineDisplayName && (
                <p className="text-xs text-gray-500 italic">No contact info available</p>
              )}
            </div>
          </div>

          {/* Leads */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Leads ({contact.leads.length})</h3>
              <button onClick={() => setShowCreateLead(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-all">
                <Plus className="w-3 h-3" /> Create Lead
              </button>
            </div>

            {contact.leads.length === 0 ? (
              <div className="text-center py-6">
                <Target className="w-8 h-8 mx-auto mb-2 text-gray-500 opacity-30" />
                <p className="text-xs text-gray-500">No leads yet</p>
                <p className="text-xs text-gray-600 mt-1">Chat with the contact first, then create a lead when ready</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contact.leads.map((lead) => (
                  <button key={lead.id} onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center justify-between group">
                    <div>
                      <p className="text-sm font-medium text-white">{lead.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stageBadge[lead.stage] || 'bg-gray-500/20 text-gray-400'}`}>
                          {lead.stage}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat Messages */}
        <div className="lg:col-span-2 glass-card flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Conversations ({contact.messages.length})
            </h3>
            {hasLine && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LINE Active
              </span>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {contact.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-500 opacity-20" />
                  <p className="text-sm text-gray-500">No messages yet</p>
                  {hasLine && <p className="text-xs text-gray-600 mt-1">Send the first message to start a conversation</p>}
                </div>
              </div>
            ) : (
              <>
                {[...contact.messages].reverse().map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.direction === 'OUTBOUND'
                        ? 'bg-blue-500/20 border border-blue-500/20'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.direction === 'INBOUND' ? (
                          <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {contact.lineDisplayName || contact.firstName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-blue-400 flex items-center gap-1">
                            {msg.metadata?.aiGenerated ? <Bot className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                            {msg.metadata?.aiGenerated ? 'AI Draft' : 'You'}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          msg.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400' :
                          msg.status === 'RECEIVED' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{msg.status}</span>
                      </div>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.createdAt).toLocaleString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Reply Input */}
          {hasLine ? (
            <div className="p-4 border-t border-white/5">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message... (Enter to send)"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!replyText.trim() || sending}
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:shadow-none"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-white/5 text-center">
              <p className="text-xs text-gray-500">This contact is not connected to LINE. Messaging is unavailable.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateLead(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative glass-card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Create Lead from Contact</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will create a new lead linked to <strong className="text-white">{contact.firstName} {contact.lastName}</strong> and attach all existing messages.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Lead Title</label>
              <input type="text" value={leadTitle} onChange={(e) => setLeadTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
                placeholder={`LINE Inquiry - ${contact.firstName} ${contact.lastName}`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreateLead(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all">Cancel</button>
              <button onClick={handleCreateLead} disabled={creating}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ContactFormModal open={showEdit} contactId={contact.id} onClose={() => setShowEdit(false)} onSaved={fetchContact} />
      <ConfirmDialog open={showDelete} title="Delete Contact"
        message={`This will permanently delete "${contact.firstName} ${contact.lastName}" and unlink all associated leads.`}
        onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
