import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RequestsFilters } from '@/components/portal-inbox/RequestsFilters';
import { RequestsList, type PortalRequestRow } from '@/components/portal-inbox/RequestsList';
import { RequestDetailsSheet } from '@/components/portal-inbox/RequestDetailsSheet';
import { Inbox, LayoutDashboard, Globe } from 'lucide-react';
import PortalSettings from '@/pages/settings/PortalSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

export function PortalInboxConfig() {
  const { user } = useAuth();
  const [brokerageSlug, setBrokerageSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from('brokerages')
      .select('slug')
      .eq('user_id', user.id)
      .limit(1)
      .single()
      .then(({ data }: any) => {
        if (data?.slug) setBrokerageSlug(data.slug);
      });
  }, [user]);

  const landingUrl = brokerageSlug
    ? `${window.location.origin}/quote/${brokerageSlug}`
    : '—';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">URL da Landing Page</h3>
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com seus clientes para acessarem a cotação online.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Link público</Label>
          <Input
            readOnly
            value={landingUrl}
            className="font-mono text-sm bg-muted/50"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>
      <PortalSettings />
    </div>
  );
}

export function PortalInboxSolicitacoes() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PortalRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PortalRequestRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;
    setIsLoading(true);
    let query = (supabase as any)
      .from('portal_requests')
      .select('*, clientes(name, phone, email)')
      .eq('brokerage_user_id', user.id)
      .order('created_at', { ascending: false });
    if (statusFilter !== 'todos') query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (!error && data) setRequests(data as PortalRequestRow[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [user, statusFilter]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter((r) =>
      r.clientes?.name?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const [allCounts, setAllCounts] = useState({ total: 0, pendente: 0, em_atendimento: 0, concluido: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const { data } = await (supabase as any)
        .from('portal_requests')
        .select('status')
        .eq('brokerage_user_id', user.id);
      if (data) {
        const all = data as { status: string }[];
        setAllCounts({
          total: all.length,
          pendente: all.filter((r) => r.status === 'pendente').length,
          em_atendimento: all.filter((r) => r.status === 'em_atendimento').length,
          concluido: all.filter((r) => r.status === 'concluido').length,
        });
      }
    };
    fetchCounts();
  }, [user, requests]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RequestsFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        counts={allCounts}
      />
      <RequestsList
        requests={filteredRequests}
        isLoading={isLoading}
        onSelect={(req) => { setSelectedRequest(req); setSheetOpen(true); }}
      />
      <RequestDetailsSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusUpdated={fetchRequests}
      />
    </div>
  );
}

export function PortalInboxLayout() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie solicitações, administração e configurações do portal
          </p>
        </div>
      </div>

      <div className="w-full">
        <div className="flex bg-transparent border-b border-border w-full justify-start gap-4 px-0">
          <NavLink
            to="/dashboard/solicitacoes-portal"
            end
            className={({ isActive }) => 
              `flex items-center px-1 pb-3 text-sm font-medium transition-colors hover:text-foreground ${isActive || currentPath === '/dashboard/solicitacoes-portal' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`
            }
          >
            <Inbox className="w-4 h-4 mr-2" />
            Solicitações
          </NavLink>
          
          <NavLink
            to="/dashboard/solicitacoes-portal/admin"
            className={({ isActive }) => 
              `flex items-center px-1 pb-3 text-sm font-medium transition-colors hover:text-foreground ${isActive || currentPath.includes('/admin') ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`
            }
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Admin
          </NavLink>

          <NavLink
            to="/dashboard/solicitacoes-portal/config"
            className={({ isActive }) => 
              `flex items-center px-1 pb-3 text-sm font-medium transition-colors hover:text-foreground ${isActive ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`
            }
          >
            <Globe className="w-4 h-4 mr-2" />
            Portal
          </NavLink>
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Para manter retrocompatibilidade com quem importava default
export default PortalInboxLayout;
