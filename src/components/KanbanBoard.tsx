'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, User, Clock, MessageCircle, GripVertical, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface Lead {
  id: string;
  title: string;
  stage: string;
  value: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  contact: { firstName: string; lastName: string; lineUserId?: string | null } | null;
  company: { name: string } | null;
  owner: { name: string };
  aiScore?: number | null;
  _count?: { activities: number; messages: number };
}

interface KanbanBoardProps {
  leads: Lead[];
  onRefresh: () => void;
}

const columns = [
  { key: 'NEW', label: 'New', color: 'from-blue-500 to-blue-600', borderColor: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'from-purple-500 to-purple-600', borderColor: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  { key: 'PROPOSAL', label: 'Proposal', color: 'from-amber-500 to-amber-600', borderColor: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  { key: 'WON', label: 'Won', color: 'from-emerald-500 to-emerald-600', borderColor: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  { key: 'LOST', label: 'Lost', color: 'from-red-500 to-red-600', borderColor: 'border-red-500/30', bg: 'bg-red-500/5' },
];

export default function KanbanBoard({ leads, onRefresh }: KanbanBoardProps) {
  const router = useRouter();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const grouped = columns.reduce((acc, col) => {
    acc[col.key] = leads.filter(l => l.stage === col.key);
    return acc;
  }, {} as Record<string, Lead[]>);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    // Make the drag ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLead(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(stage);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    setUpdating(leadId);
    try {
      await apiFetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setUpdating(null);
    }
  };

  const getDaysInStage = (lead: Lead) => {
    const days = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getColumnValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, l) => sum + (l.value ? Number(l.value) : 0), 0);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8">
      {columns.map(col => {
        const stageLeads = grouped[col.key] || [];
        const totalValue = getColumnValue(stageLeads);
        const isDropTarget = dragOverColumn === col.key && draggedLead;
        const draggedLeadObj = draggedLead ? leads.find(l => l.id === draggedLead) : null;
        const showDropHint = isDropTarget && draggedLeadObj?.stage !== col.key;

        return (
          <div
            key={col.key}
            className={`flex-shrink-0 w-[280px] flex flex-col rounded-2xl transition-all duration-200 ${
              showDropHint ? `${col.bg} border-2 ${col.borderColor} scale-[1.01]` : 'border-2 border-transparent'
            }`}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.key)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${col.color}`} />
                <span className="text-sm font-semibold text-white">{col.label}</span>
                <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
            </div>

            {/* Total Value */}
            {totalValue > 0 && (
              <div className="px-3 pb-2">
                <span className="text-xs text-gray-500">
                  ฿{totalValue.toLocaleString()}
                </span>
              </div>
            )}

            {/* Cards */}
            <div className="flex-1 space-y-2 px-2 pb-2 min-h-[100px]">
              {stageLeads.map(lead => {
                const days = getDaysInStage(lead);
                const isBeingUpdated = updating === lead.id;

                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={e => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className={`glass-card p-3 cursor-pointer group transition-all duration-200 hover:border-white/20 hover:shadow-lg ${
                      isBeingUpdated ? 'opacity-50 animate-pulse' : ''
                    } ${draggedLead === lead.id ? 'opacity-50' : ''}`}
                  >
                    {/* Drag Handle + Title */}
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{lead.title}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-2 space-y-1.5 ml-5">
                      {lead.value && (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-medium">{formatCurrency(lead.value)}</span>
                        </div>
                      )}
                      {lead.contact && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <User className="w-3 h-3" />
                          <span className="text-xs truncate">
                            {lead.contact.firstName} {lead.contact.lastName}
                          </span>
                          {lead.contact.lineUserId && <MessageCircle className="w-3 h-3 text-emerald-400" />}
                        </div>
                      )}
                      {lead.company && (
                        <p className="text-xs text-gray-500 truncate">{lead.company.name}</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-2 ml-5 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px]">
                          {days === 0 ? 'Today' : `${days}d`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.aiScore && (
                          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
                            lead.aiScore >= 70 ? 'text-emerald-400' : lead.aiScore >= 40 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            <Sparkles className="w-3 h-3" /> {lead.aiScore}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600">
                          {lead.owner.name.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Drop zone hint */}
              {showDropHint && (
                <div className={`border-2 border-dashed ${col.borderColor} rounded-xl py-6 flex items-center justify-center`}>
                  <span className="text-xs text-gray-400">Drop here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
