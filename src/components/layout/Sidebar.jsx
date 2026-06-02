import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Kanban, MessageSquare, Zap, Users, Settings, BookOpen, Send, Workflow, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { icon: Kanban, label: 'Pipeline', path: '/' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Zap, label: 'Automações', path: '/automacoes' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: Send, label: 'Disparos', path: '/disparos' },
  { icon: Workflow, label: 'n8n / Webhooks', path: '/n8n' },
  { icon: BookOpen, label: 'Documentação', path: '/docs' },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-[72px] bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 z-50">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-8 shadow-gold">
        <span className="text-primary-foreground font-bold text-lg">C</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="absolute left-16 bg-card border border-border text-foreground text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <Link
        to="/configuracoes"
        className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
      >
        <Settings className="w-5 h-5" />
      </Link>
      <button
        onClick={() => logout()}
        className="mt-4 w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </aside>
  );
}   