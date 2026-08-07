'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Zap,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Search,
  Command,
} from 'lucide-react';
import { getAuthToken, clearAuthToken, apiGet } from '@/lib/api';
import GlobalSearch from '@/components/GlobalSearch';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Target },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/companies', label: 'Companies', icon: Building2 },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    apiGet<{ user: User }>('/api/auth/me')
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        clearAuthToken();
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-glow w-8 h-8 rounded-full bg-blue-500" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[hsl(0,0%,8%)] border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">AI CRM</span>
            <p className="text-[10px] text-gray-500 tracking-wider">JENOSIZE</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  active
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 flex items-center px-4 lg:px-8 gap-4 bg-[hsl(0,0%,7%)]/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white capitalize">
            {pathname === '/dashboard'
              ? 'Dashboard'
              : pathname.split('/').pop()?.replace(/\[.*\]/, '') || 'Dashboard'}
          </h2>
          <div className="ml-auto">
            <button
              onClick={() => {
                const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                window.dispatchEvent(evt);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-1 text-gray-500">
                <Command className="w-3 h-3 inline" />K
              </kbd>
            </button>
          </div>
        </header>
        <GlobalSearch />

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
