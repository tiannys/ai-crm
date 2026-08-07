'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, User, Calendar, DollarSign, MessageCircle,
  Brain, TrendingUp, Sparkles, Send, Check, X, Edit3, Loader2,
  AlertTriangle, Clock, Phone, Mail, Notebook, Users, Zap, Target,
  Plus, Trash2, CheckSquare, Square, ListFilter, Paperclip, Upload, Download, FileText,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { apiFetch, getAuthToken, getCurrentUserRole } from '@/lib/api';
import LeadFormModal from '@/components/modals/LeadFormModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

// ─── Types ───────────────────────────────────────────────────────
interface LeadDetail {
  id: string;
  title: string;
  stage: string;
  value: string | null;
  source: string;
  notes: string | null;
  aiScore: number | null;
  aiScoreReasons: string | null;
  aiSummary: string | null;
  expectedClose: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; industry: string | null } | null;
  contact: {
    id: string; firstName: string; lastName: string;
    email: string | null; phone: string | null; position: string | null; lineUserId: string | null;
  } | null;
  owner: { id: string; name: string; email: string };
  activities: Array<{
    id: string; type: string; description: string; createdAt: string;
    metadata: Record<string, unknown> | null; user: { name: string };
  }>;
  messages: Array<{
    id: string; channel: string; direction: string; content: string;
    status: string; createdAt: string; metadata?: Record<string, unknown> | null;
  }>;
}

interface Task {
  id: string; title: string; status: string; priority: string;
  dueDate: string | null; assignee: { name: string };
}

interface Attachment {
  id: string; fileName: string; fileType: string; fileSize: number;
  category: string | null; notes: string | null; createdAt: string;
}

const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const activityIcons: Record<string, typeof Phone> = {
  NOTE: Notebook, CALL: Phone, EMAIL: Mail, MEETING: Users,
  STAGE_CHANGE: TrendingUp, LEAD_UPDATED: Edit3, LINE_MESSAGE: MessageCircle, AI_ACTION: Brain,
  TASK_CREATED: Plus, TASK_COMPLETED: CheckSquare, FILE_ATTACHED: Paperclip,
};

const activityColors: Record<string, string> = {
  NOTE: 'bg-gray-500/20 text-gray-400', CALL: 'bg-green-500/20 text-green-400',
  EMAIL: 'bg-blue-500/20 text-blue-400', MEETING: 'bg-purple-500/20 text-purple-400',
  STAGE_CHANGE: 'bg-amber-500/20 text-amber-400', LEAD_UPDATED: 'bg-indigo-500/20 text-indigo-400',
  LINE_MESSAGE: 'bg-emerald-500/20 text-emerald-400',
  AI_ACTION: 'bg-pink-500/20 text-pink-400',
  TASK_CREATED: 'bg-orange-500/20 text-orange-400', TASK_COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  FILE_ATTACHED: 'bg-cyan-500/20 text-cyan-400',
};

const timelineFilters = ['all', 'notes', 'messages', 'calls', 'changes'] as const;
type TimelineFilter = typeof timelineFilters[number];
const filterLabels: Record<TimelineFilter, string> = {
  all: 'All', notes: 'Notes', messages: 'Messages', calls: 'Calls', changes: 'Changes',
};
const filterTypeMap: Record<TimelineFilter, string[]> = {
  all: [],
  notes: ['NOTE'],
  messages: ['LINE_MESSAGE', 'message'],
  calls: ['CALL'],
  changes: ['STAGE_CHANGE', 'LEAD_UPDATED', 'TASK_CREATED', 'TASK_COMPLETED', 'FILE_ATTACHED'],
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'conversations' | 'ai'>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [addingTask, setAddingTask] = useState(false);

  // Modal states
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');

  // Reply state for Conversations tab
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await apiFetch(`/api/crm/leads/${id}`);
      if (!res.ok) throw new Error('Lead not found');
      setLead(await res.json());
    } catch {
      router.push('/dashboard/leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await apiFetch(`/api/crm/tasks?leadId=${id}`);
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ }
  };

  const fetchAttachments = async () => {
    try {
      const res = await apiFetch(`/api/crm/leads/${id}/attachments`);
      if (res.ok) setAttachments(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchLead(); fetchTasks(); fetchAttachments(); }, [id]);

  const updateStage = async (newStage: string) => {
    if (!lead || lead.stage === newStage) return;
    try {
      await apiFetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      fetchLead(); // Refresh to pick up auto-logged STAGE_CHANGE activity
    } catch (err) { console.error('Failed to update stage:', err); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch(`/api/crm/leads/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NOTE', description: newNote }),
      });
      setNewNote('');
      fetchLead();
    } catch (err) { console.error('Failed to add note:', err); }
    finally { setAddingNote(false); }
  };

  const addQuickTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await apiFetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle, leadId: id, priority: newTaskPriority }),
      });
      setNewTaskTitle('');
      setNewTaskPriority('MEDIUM');
      fetchTasks();
      fetchLead(); // Refresh timeline for TASK_CREATED activity
    } catch (err) { console.error('Failed to add task:', err); }
    finally { setAddingTask(false); }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      await apiFetch(`/api/crm/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
      if (newStatus === 'DONE') fetchLead(); // Refresh timeline for TASK_COMPLETED
    } catch (err) { console.error('Failed to toggle task:', err); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      const token = getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/crm/leads/${id}/attachments`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (res.ok) {
        fetchAttachments();
        fetchLead(); // Refresh timeline for FILE_ATTACHED
      }
    } catch (err) { console.error('Failed to upload:', err); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await apiFetch(`/api/crm/attachments/${attachmentId}`, { method: 'DELETE' });
      fetchAttachments();
    } catch (err) { console.error('Failed to delete:', err); }
  };

  const downloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const res = await apiFetch(`/api/crm/attachments/${attachmentId}/download`);
      if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download attachment:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      router.push('/dashboard/leads');
    } catch (err) { console.error('Failed to delete:', err); }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const createRes = await apiFetch('/api/line/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, content: replyText.trim() }),
      });
      if (createRes.ok) {
        const { messageId } = await createRes.json();
        await apiFetch('/api/line/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, action: 'approve' }),
        });
        setReplyText('');
        fetchLead();
      }
    } catch (err) { console.error('Failed to send reply:', err); }
    finally { setSendingReply(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lead) return null;

  // Build unified timeline items
  type TimelineItem = { id: string; type: 'activity' | 'message'; subType: string; createdAt: string; data: any };
  const allItems: TimelineItem[] = [
    ...lead.activities.map(a => ({ id: `a-${a.id}`, type: 'activity' as const, subType: a.type, createdAt: a.createdAt, data: a })),
    ...lead.messages.map(m => ({ id: `m-${m.id}`, type: 'message' as const, subType: 'message', createdAt: m.createdAt, data: m })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredItems = timelineFilter === 'all' ? allItems :
    allItems.filter(item => filterTypeMap[timelineFilter].includes(item.type === 'activity' ? item.subType : 'message'));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push('/dashboard/leads')} className="mt-1 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{lead.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`stage-${lead.stage.toLowerCase()} px-2.5 py-1 rounded-md text-xs font-medium`}>{lead.stage}</span>
            {lead.company && <span className="text-sm text-gray-400 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {lead.company.name}</span>}
            {lead.value && <span className="text-sm text-emerald-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {formatCurrency(lead.value)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Edit Lead">
            <Edit3 className="w-4 h-4" />
          </button>
          {getCurrentUserRole() === 'ADMIN' && (
            <button onClick={() => setShowDelete(true)} className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all" title="Delete Lead">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-1">
          {stages.map((s, i) => {
            const isCurrent = lead.stage === s;
            const isPast = stages.indexOf(lead.stage) > i;
            const isLost = lead.stage === 'LOST';
            return (
              <button key={s} onClick={() => updateStage(s)}
                className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all ${
                  isCurrent ? (isLost ? 'bg-red-500/20 text-red-400 border border-red-500/30' : `stage-${s.toLowerCase()}`)
                  : isPast && !isLost ? 'bg-white/5 text-gray-400' : 'bg-white/3 text-gray-600 hover:bg-white/5 hover:text-gray-400'
                }`}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 flex gap-2">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add a note..." className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
              <button onClick={addNote} disabled={addingNote || !newNote.trim()}
                className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium rounded-xl transition-all disabled:opacity-30">
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Notebook className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tabs: Timeline | Conversations | AI Copilot */}
          <div className="flex items-center gap-1 bg-white/3 p-1 rounded-xl">
            {[
              { key: 'timeline' as const, label: 'Timeline', icon: Clock },
              { key: 'conversations' as const, label: 'Conversations', icon: MessageCircle },
              { key: 'ai' as const, label: 'AI Copilot', icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
                {key === 'conversations' && lead.messages.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{lead.messages.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── Timeline Tab ──────────────────────────────────── */}
          {activeTab === 'timeline' && (
            <div className="glass-card p-5 space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <ListFilter className="w-3.5 h-3.5 text-gray-500" />
                {timelineFilters.map(f => (
                  <button key={f} onClick={() => setTimelineFilter(f)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      timelineFilter === f ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}>
                    {filterLabels[f]}
                  </button>
                ))}
              </div>

              {/* Timeline Items */}
              <div className="space-y-1">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No timeline events</p>
                ) : (
                  filteredItems.map((item, idx) => {
                    if (item.type === 'activity') {
                      const activity = item.data;
                      const Icon = activityIcons[activity.type] || Notebook;
                      const color = activityColors[activity.type] || 'bg-gray-500/20 text-gray-400';
                      return (
                        <div key={item.id} className="flex gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}><Icon className="w-4 h-4" /></div>
                            {idx < filteredItems.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <p className="text-sm text-gray-300">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{activity.user.name}</span>
                              <span className="text-xs text-gray-600">•</span>
                              <span className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const msg = item.data;
                      const isInbound = msg.direction === 'INBOUND';
                      return (
                        <div key={item.id} className="flex gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isInbound ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {isInbound ? <MessageCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            </div>
                            {idx < filteredItems.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${isInbound ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {isInbound ? '💬 LINE Inbound' : '📤 LINE Outbound'}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                msg.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400' : msg.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400' :
                                msg.status === 'RECEIVED' ? 'bg-blue-500/20 text-blue-400' : msg.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>{msg.status}</span>
                            </div>
                            <div className={`p-2.5 rounded-xl text-sm text-gray-200 ${isInbound ? 'bg-white/5 border border-white/10' : 'bg-blue-500/10 border border-blue-500/10'}`}>{msg.content}</div>
                            <span className="text-xs text-gray-500 mt-1 block">{formatDateTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </div>
          )}

          {/* ─── Conversations Tab ─────────────────────────────── */}
          {activeTab === 'conversations' && (
            <div className="glass-card p-5 space-y-4">
              {lead.messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-500 opacity-30" />
                  <p className="text-sm text-gray-500">No messages yet</p>
                  {!lead.contact?.lineUserId && <p className="text-xs text-gray-600 mt-1">Contact is not linked to LINE</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {[...lead.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(msg => {
                      const isInbound = msg.direction === 'INBOUND';
                      return (
                        <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isInbound ? 'bg-white/5 border border-white/10' : 'bg-blue-500/20 border border-blue-500/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-medium flex items-center gap-1 ${isInbound ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {isInbound ? <><MessageCircle className="w-3 h-3" /> {lead.contact?.firstName || 'Customer'}</> : <><Send className="w-3 h-3" /> You</>}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(msg.createdAt).toLocaleString('th-TH')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Reply Input */}
                  {lead.contact?.lineUserId && (
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type a reply..."
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50" />
                      <button onClick={sendReply} disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── AI Tab ────────────────────────────────────────── */}
          {activeTab === 'ai' && <AiCopilotPanel leadId={id} />}
        </div>

        {/* ─── Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Lead Info */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Lead Details</h3>
            <div className="space-y-3">
              <InfoRow label="Source" value={lead.source} />
              <InfoRow label="Value" value={lead.value ? formatCurrency(lead.value) : 'Not set'} />
              <InfoRow label="Expected Close" value={lead.expectedClose ? formatDate(lead.expectedClose) : 'Not set'} />
              <InfoRow label="Owner" value={lead.owner.name} />
              <InfoRow label="Created" value={formatDate(lead.createdAt)} />
              {lead.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-300">{lead.notes}</p></div>}
            </div>
          </div>

          {/* Contact Info */}
          {lead.contact && (
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> Contact</h3>
              <div className="space-y-2">
                <p className="text-sm text-white">{lead.contact.firstName} {lead.contact.lastName}</p>
                {lead.contact.position && <p className="text-xs text-gray-400">{lead.contact.position}</p>}
                {lead.contact.email && <p className="text-xs text-gray-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {lead.contact.email}</p>}
                {lead.contact.phone && <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {lead.contact.phone}</p>}
                {lead.contact.lineUserId && <p className="text-xs text-emerald-400 flex items-center gap-1.5"><MessageCircle className="w-3 h-3" /> LINE Connected</p>}
              </div>
            </div>
          )}

          {/* Company Info */}
          {lead.company && (
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> Company</h3>
              <p className="text-sm text-white">{lead.company.name}</p>
              {lead.company.industry && <p className="text-xs text-gray-400">{lead.company.industry}</p>}
            </div>
          )}

          {/* Tasks */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CheckSquare className="w-4 h-4 text-amber-400" /> Tasks</h3>
            <div className="space-y-2">
              {tasks.map(task => (
                <button key={task.id} onClick={() => toggleTask(task.id, task.status)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group">
                  {task.status === 'DONE'
                    ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${task.status === 'DONE' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{task.title}</p>
                    {task.dueDate && <p className="text-[10px] text-gray-600">{formatDate(task.dueDate)}</p>}
                  </div>
                  <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                    task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>{task.priority}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuickTask()}
                  placeholder="Add task..." className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
                <button onClick={addQuickTask} disabled={addingTask || !newTaskTitle.trim()}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium rounded-lg transition-all disabled:opacity-30">
                  {addingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
              {/* Priority Picker */}
              <div className="flex gap-1">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                  <button key={p} onClick={() => setNewTaskPriority(p)}
                    className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-all ${
                      newTaskPriority === p
                        ? p === 'HIGH' ? 'bg-red-500/30 text-red-400 ring-1 ring-red-500/50'
                          : p === 'MEDIUM' ? 'bg-amber-500/30 text-amber-400 ring-1 ring-amber-500/50'
                          : 'bg-blue-500/30 text-blue-400 ring-1 ring-blue-500/50'
                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                    }`}>
                    {p === 'HIGH' ? '🔴' : p === 'MEDIUM' ? '🟡' : '🔵'} {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Paperclip className="w-4 h-4 text-cyan-400" /> Attachments</h3>
            
            {/* File list */}
            <div className="space-y-1.5">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 group">
                  <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{att.fileName}</p>
                    <div className="flex gap-2 text-[10px] text-gray-500">
                      <span>{formatFileSize(att.fileSize)}</span>
                      {att.category && att.category !== 'other' && (
                        <span className="px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{att.category}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => downloadAttachment(att.id, att.fileName)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-cyan-400 text-gray-500 transition-all" title="Download">
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeleteAttachment(att.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-all" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50">
                <option value="quotation">📄 Quotation</option>
                <option value="sow">📋 SOW</option>
                <option value="tor">📋 TOR</option>
                <option value="contract">📑 Contract</option>
                <option value="invoice">🧾 Invoice</option>
                <option value="other">📁 Other</option>
              </select>
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-medium rounded-lg cursor-pointer transition-all">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.csv,.txt,.zip" />
              </label>
            </div>
          </div>

          {/* AI Quick Score */}
          {lead.aiScore && (
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> AI Score</h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                  lead.aiScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' : lead.aiScore >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                }`}>{lead.aiScore}</div>
                <div className="flex-1">
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      lead.aiScore >= 70 ? 'bg-emerald-500' : lead.aiScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`} style={{ width: `${lead.aiScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LeadFormModal open={showEdit} leadId={id} onClose={() => setShowEdit(false)} onSaved={fetchLead} />
      <ConfirmDialog open={showDelete} title="Delete Lead" message="This will permanently delete this lead, all activities, and associated data. This cannot be undone."
        onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-300">{value}</span>
    </div>
  );
}

// ─── AI Copilot Panel ────────────────────────────────────────────
function AiCopilotPanel({ leadId }: { leadId: string }) {
  const [summary, setSummary] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [nextAction, setNextAction] = useState<any>(null);
  const [draftReply, setDraftReply] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const callAi = async (endpoint: string, setter: (data: unknown) => void) => {
    setLoadingStates(s => ({ ...s, [endpoint]: true }));
    try {
      const res = await apiFetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      setter(await res.json());
    } catch {
      setter({ success: false, error: 'Failed to reach AI service' });
    } finally {
      setLoadingStates(s => ({ ...s, [endpoint]: false }));
    }
  };

  const aiCards = [
    {
      key: 'summarize', title: 'Lead Summary', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10',
      data: summary, setter: setSummary,
      render: (d: any) => d?.data && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">{d.data.summary}</p>
          {d.data.keyPoints?.length > 0 && (
            <ul className="space-y-1">{d.data.keyPoints.map((p: string, i: number) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {p}</li>
            ))}</ul>
          )}
          {d.fallback && <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fallback response</p>}
        </div>
      ),
    },
    {
      key: 'score', title: 'Qualification Score', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10',
      data: score, setter: setScore,
      render: (d: any) => d?.data && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
              d.data.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : d.data.score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
            }`}>{d.data.score}</div>
            <div className="flex-1">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${d.data.score >= 70 ? 'bg-emerald-500' : d.data.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.data.score}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Confidence: {d.data.confidence}</p>
            </div>
          </div>
          <ul className="space-y-1">{d.data.reasons?.map((r: string, i: number) => (
            <li key={i} className="text-xs text-gray-400 flex items-start gap-2"><span className="text-purple-400 mt-0.5">•</span> {r}</li>
          ))}</ul>
        </div>
      ),
    },
    {
      key: 'next-action', title: 'Next Best Action', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10',
      data: nextAction, setter: setNextAction,
      render: (d: any) => d?.data && (
        <div className="space-y-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            d.data.priority === 'high' ? 'bg-red-500/20 text-red-400' : d.data.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
          }`}>{d.data.priority?.toUpperCase()}</span>
          <p className="text-sm text-white font-medium">{d.data.action}</p>
          <p className="text-xs text-gray-400">{d.data.reasoning}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {d.data.suggestedTimeline}</p>
        </div>
      ),
    },
    {
      key: 'draft-reply', title: 'Draft LINE Reply', icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
      data: draftReply, setter: setDraftReply,
      render: (d: any) => d?.data && (
        <DraftReplyEditor leadId={leadId} initialContent={d.data.content || d.data.reply || ''}
          tone={d.data.tone} context={d.data.context} fallback={d.fallback}
          onRegenerate={() => callAi('draft-reply', setDraftReply)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">AI CRM Copilot</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">AI Suggestions Only</span>
      </div>
      {aiCards.map(card => {
        const Icon = card.icon;
        const isLoading = loadingStates[card.key];
        return (
          <div key={card.key} className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}><Icon className={`w-3.5 h-3.5 ${card.color}`} /></div>
                <h4 className="text-sm font-medium text-white">{card.title}</h4>
              </div>
              <button onClick={() => callAi(card.key, card.setter)} disabled={isLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isLoading ? 'bg-white/5 text-gray-500' : `${card.bg} ${card.color} hover:opacity-80`}`}>
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : card.data ? 'Refresh' : 'Generate'}
              </button>
            </div>
            {card.data && card.render(card.data)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Draft Reply Editor ──────────────────────────────────────────
function DraftReplyEditor({ leadId, initialContent, tone, context, fallback, onRegenerate }: {
  leadId: string; initialContent: string; tone?: string; context?: string; fallback?: boolean; onRegenerate: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setContent(initialContent); setSent(false); setError(''); }, [initialContent]);

  const handleSendReply = async () => {
    if (!content.trim()) return;
    setSending(true); setError('');
    try {
      const createRes = await apiFetch('/api/line/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content: content.trim() }),
      });
      if (!createRes.ok) { setError('Failed to create draft'); return; }
      const { messageId } = await createRes.json();
      const sendRes = await apiFetch('/api/line/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action: 'approve' }),
      });
      if (sendRes.ok) setSent(true);
      else { const d = await sendRes.json(); setError(d.error || 'Failed to send'); }
    } catch { setError('Failed to send reply'); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-3">
      <textarea value={content} onChange={e => { setContent(e.target.value); setSent(false); }} rows={4}
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 resize-none"
        placeholder="Edit the AI-generated reply..." />
      <div className="flex items-center gap-2 flex-wrap">
        {tone && <span className="text-xs text-gray-500">Tone: {tone}</span>}
        {context && <><span className="text-xs text-gray-600">•</span><span className="text-xs text-gray-500">{context}</span></>}
      </div>
      {fallback && <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fallback response (AI unavailable)</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> {error}</p>}
      {sent ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Check className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400 font-medium">Sent to LINE successfully!</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium rounded-lg transition-all">
            <Sparkles className="w-3 h-3" /> Regenerate
          </button>
          <button onClick={handleSendReply} disabled={sending || !content.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send to LINE</>}
          </button>
        </div>
      )}
    </div>
  );
}
