'use client';

import { useEffect, useState } from 'react';
import {
  Target,
  Users,
  Building2,
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  Trophy,
  Percent,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface DashboardData {
  totalLeads: number;
  totalContacts: number;
  totalCompanies: number;
  pipelineValue: number;
  stageBreakdown: Record<string, number>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: { name: string };
    lead?: { id: string; title: string };
  }>;
  wonDeals: number;
  conversionRate: number;
}

const stageConfig = [
  { key: 'NEW', label: 'New', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  { key: 'PROPOSAL', label: 'Proposal', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  { key: 'WON', label: 'Won', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { key: 'LOST', label: 'Lost', color: 'from-red-500 to-red-600', bg: 'bg-red-500/10', text: 'text-red-400' },
];

const activityIcons: Record<string, string> = {
  NOTE: '📝',
  CALL: '📞',
  EMAIL: '📧',
  MEETING: '🤝',
  STAGE_CHANGE: '🔄',
  LINE_MESSAGE: '💬',
  AI_ACTION: '🤖',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/crm/dashboard')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: 'Total Leads',
      value: data.totalLeads,
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(data.pipelineValue),
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Won Deals',
      value: data.wonDeals,
      icon: Trophy,
      color: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/20',
    },
    {
      label: 'Conversion',
      value: `${data.conversionRate}%`,
      icon: Percent,
      color: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card p-5 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Overview */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">Pipeline Overview</h3>
            <Link
              href="/dashboard/leads"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stageConfig.map((stage) => {
              const count = data.stageBreakdown[stage.key] || 0;
              const maxCount = Math.max(...Object.values(data.stageBreakdown), 1);
              const percent = (count / maxCount) * 100;

              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-20 ${stage.text}`}>{stage.label}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${stage.color} rounded-lg flex items-center justify-end pr-2 transition-all duration-700`}
                      style={{ width: `${Math.max(percent, 8)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{data.totalContacts}</p>
              <p className="text-xs text-gray-500">Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{data.totalCompanies}</p>
              <p className="text-xs text-gray-500">Companies</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{data.totalLeads}</p>
              <p className="text-xs text-gray-500">Total Leads</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-5">Recent Activity</h3>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {data.recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm flex-shrink-0">
                  {activityIcons[activity.type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 line-clamp-2">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{activity.user.name}</span>
                    {activity.lead && (
                      <>
                        <span className="text-xs text-gray-600">•</span>
                        <Link
                          href={`/dashboard/leads/${activity.lead.id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 truncate"
                        >
                          {activity.lead.title}
                        </Link>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
