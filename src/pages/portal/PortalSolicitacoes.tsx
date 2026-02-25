import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Inbox, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PortalRequest {
  id: string;
  request_type: string;
  insurance_type: string;
  status: string;
  created_at: string;
  is_qualified: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  em_atendimento: { label: 'Em Atendimento', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  concluido: { label: 'Concluído', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
};

const typeLabels: Record<string, string> = {
  cotacao: 'Cotação',
  endosso: 'Endosso',
  sinistro: 'Sinistro',
  renovacao: 'Renovação',
};

export default function PortalSolicitacoes() {
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const clientData = sessionStorage.getItem('portal_client');
      if (!clientData) return;

      const client = JSON.parse(clientData);

      const brokerageData = sessionStorage.getItem('portal_brokerage');
      if (!brokerageData) return;
      const brokerage = JSON.parse(brokerageData);

      const { data, error } = await (supabase as any).rpc('get_portal_requests_by_client', {
        p_client_id: client.id,
        p_brokerage_user_id: brokerage.user_id,
      });

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      setRequests(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-20 w-full bg-muted rounded-3xl" />
        <Skeleton className="h-20 w-full bg-muted rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground tracking-tight">Minhas Solicitações</h2>

      {requests.length === 0 ? (
        <div className="bg-card rounded-3xl shadow-sm p-8 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma solicitação enviada ainda.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
          {requests.map((req, idx) => {
            const status = statusConfig[req.status] || statusConfig.pendente;
            return (
              <div
                key={req.id}
                className={cn(
                  'flex items-center gap-3 p-5 transition-colors',
                  idx !== requests.length - 1 && 'border-b border-muted/50'
                )}
              >
                <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {typeLabels[req.request_type] || req.request_type}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {req.insurance_type || 'Seguro'}
                      </p>
                    </div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
