import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Clock, Inbox, ChevronRight, CheckCircle2, User, Phone, Mail, FileCheck } from 'lucide-react';
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
  const [selectedRequest, setSelectedRequest] = useState<PortalRequest | null>(null);

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

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          request_type,
          insurance_type,
          status,
          created_at,
          is_qualified,
          custom_fields
        `)
        .eq('client_id', client.id)
        .eq('brokerage_user_id', brokerage.user_id)
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

  const parseCustomFields = (fields: any) => {
    if (!fields) return null;
    let parsed = fields;
    if (typeof fields === 'string') {
      try {
        parsed = JSON.parse(fields);
      } catch (e) {
        return null;
      }
    }
    return parsed;
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
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={cn(
                  'w-full flex items-center gap-3 p-5 transition-colors text-left hover:bg-muted/30 focus:outline-none focus:bg-muted/30',
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
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl p-0 overflow-hidden border-0 gap-0">
          <div className="bg-muted/30 px-6 py-5 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Detalhes da Solicitação
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="flex items-center gap-3 mt-3">
                <Badge className={(statusConfig[selectedRequest.status] || statusConfig.pendente).className}>
                  {(statusConfig[selectedRequest.status] || statusConfig.pendente).label}
                </Badge>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-6">
            {selectedRequest && (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</p>
                  <p className="text-sm font-medium text-foreground">
                    {typeLabels[selectedRequest.request_type] || selectedRequest.request_type} - {selectedRequest.insurance_type || 'Seguro'}
                  </p>
                </div>

                {parseCustomFields(selectedRequest.custom_fields) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações Preenchidas</p>
                    <div className="bg-muted/20 border border-muted-foreground/10 rounded-2xl p-4 text-sm space-y-3">
                      {Object.entries(parseCustomFields(selectedRequest.custom_fields)).map(([key, value]) => {
                        // Ignore specific technical keys
                        if (['cf_qar_auto', 'cf_qar_residencial', 'cf_qar_vida', 'cf_qar_empresarial', 'cf_qar_viagem', 'cf_qar_saude', 'cf_qar_respondido', 'cf_lead_id'].includes(key)) return null;

                        // Parse qar report inside if present
                        if (typeof value === 'object' && value !== null) {
                          return null; // Skip complex objects for now, or stringify
                        }

                        let displayKey = key.replace('cf_', '').replace(/_/g, ' ');
                        displayKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1);

                        // Mapeamento de chaves comuns
                        const keyMap: Record<string, string> = {
                          'policy id': 'ID da Apólice',
                          'policy number': 'Número da Apólice',
                          'policy insurance company': 'Seguradora',
                          'policy product': 'Produto',
                          'policy insured asset': 'Bem Segurado',
                          'description': 'Descrição',
                          'request context': 'Contexto',
                        };

                        displayKey = keyMap[displayKey.toLowerCase()] || displayKey;

                        if (!value) return null;

                        return (
                          <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-border/50 last:border-0 pb-2 last:pb-0">
                            <span className="text-muted-foreground font-medium min-w-[120px]">{displayKey}:</span>
                            <span className="text-foreground whitespace-pre-wrap flex-1">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
