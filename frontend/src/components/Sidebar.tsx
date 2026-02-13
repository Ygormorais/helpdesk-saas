import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, FolderOpen, BookOpen, PenTool, Users, Webhook, History, Settings, MessageCircle, LogOut, Star, Clock, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'manager' | 'agent' | 'client';

const navigation: Array<{ name: string; href: string; icon: any; roles?: Role[] }> = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Categorias', href: '/categories', icon: FolderOpen, roles: ['admin', 'manager', 'agent'] },
  { name: 'Base de Conhecimento', href: '/knowledge', icon: BookOpen },
  { name: 'Equipe', href: '/team', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Admin Artigos', href: '/admin/articles', icon: PenTool, roles: ['admin', 'manager', 'agent'] },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook, roles: ['admin', 'manager'] },
  { name: 'Satisfação', href: '/satisfaction', icon: Star, roles: ['admin', 'manager', 'agent'] },
  { name: 'Tempo', href: '/time', icon: Clock, roles: ['admin', 'manager', 'agent'] },
  { name: 'Planos', href: '/plans', icon: CreditCard, roles: ['admin', 'manager'] },
  { name: 'Audit Log', href: '/audit', icon: History, roles: ['admin'] },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  const role = (user?.role || 'client') as Role;
  const items = navigation.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">HelpDesk</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}
