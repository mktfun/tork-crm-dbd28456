import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle2, AlertCircle, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PortalRequest {
  id: string;
  request_type: string;
  insurance_type: string;
  status: string;
  created_at: string;
  is_qualified: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  em_atendimento: { label: 'Em Atendimento', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  concluido: { label: 'Concluído', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
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

      const { data, error } = await (supabase as any)
        .from('portal_requests')
        .select('id, request_type, insurance_type, status, created_at, is_qualified')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

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
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-light text-white tracking-wide">Minhas Solicitações</h2>

      {requests.length === 0 ? (
        <Card className="bg-black/70 border-white/[0.06] backdrop-blur-2xl">
          <CardContent className="p-8 text-center">
            <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 font-light">Nenhuma solicitação enviada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status = statusConfig[req.status] || statusConfig.pendente;
            return (
              <Card
                key={req.id}
                className="bg-black/70 border-white/[0.06] backdrop-blur-2xl"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-800/80 rounded-lg flex items-center justify-center text-zinc-400 flex-shrink-0 border border-white/[0.06]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-light text-white">
                            {typeLabels[req.request_type] || req.request_type}
                          </h3>
                          <p className="text-sm text-zinc-500">
                            {req.insurance_type || 'Seguro'}
                          </p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-600 mt-2">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
