import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '฿0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    QUALIFIED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    PROPOSAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    WON: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return colors[stage] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    WEBSITE: '🌐',
    MANUAL: '✏️',
    LINE: '💬',
  };
  return icons[source] || '📌';
}
