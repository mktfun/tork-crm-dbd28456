import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RequestsFilters } from '@/components/portal-inbox/RequestsFilters';
import { RequestsList, type PortalRequestRow } from '@/components/portal-inbox/RequestsList';
import { RequestDetailsSheet } from '@/components/portal-inbox/RequestDetailsSheet';
import { Inbox } from 'lucide-react';

export default function PortalInbox() {
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

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data as PortalRequestRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user, statusFilter]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter((r) =>
      r.clientes?.name?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const counts = useMemo(() => {
    // For counts we need all requests (not filtered by status)
    // Since we re-fetch on filter change, compute from current data when filter is 'todos'
    const all = statusFilter === 'todos' ? requests : requests;
    return {
      total: all.length,
      pendente: all.filter((r) => r.status === 'pendente').length,
      em_atendimento: all.filter((r) => r.status === 'em_atendimento').length,
      concluido: all.filter((r) => r.status === 'concluido').length,
    };
  }, [requests, statusFilter]);

  // Fetch all counts separately when filter is active
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

  const handleSelect = (req: PortalRequestRow) => {
    setSelectedRequest(req);
    setSheetOpen(true);
  };

  const handleStatusUpdated = () => {
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações do Portal</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as solicitações recebidas dos seus clientes
          </p>
        </div>
      </div>

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
        onSelect={handleSelect}
      />

      <RequestDetailsSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
