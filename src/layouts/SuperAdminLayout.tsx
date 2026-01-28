import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  Building2, 
  Cpu, 
  FileText,
  Shield,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const navItems = [
  { 
    title: 'Dashboard', 
    path: '/dashboard/super-admin', 
    icon: LayoutDashboard,
    end: true 
  },
  { 
    title: 'Corretoras', 
    path: '/dashboard/super-admin/brokerages', 
    icon: Building2 
  },
  { 
    title: 'Configurações de IA', 
    path: '/dashboard/super-admin/ai-config', 
    icon: Cpu 
  },
  { 
    title: 'Logs do Sistema', 
    path: '/dashboard/super-admin/logs', 
    icon: FileText 
  },
];

export function SuperAdminLayout() {
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
    navigate('/super-admin/login');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Skeleton className="h-12 w-64 bg-zinc-800" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">Super Admin</h1>
              <p className="text-xs text-zinc-500">Painel de Controle</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
