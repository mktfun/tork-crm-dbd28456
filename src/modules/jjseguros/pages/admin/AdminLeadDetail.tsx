import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/modules/jjseguros/integrations/supabase/client";
import { AdminLayout } from "@/modules/jjseguros/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/jjseguros/components/ui/card";
import { Button } from "@/modules/jjseguros/components/ui/button";
import { Badge } from "@/modules/jjseguros/components/ui/badge";
import { Skeleton } from "@/modules/jjseguros/components/ui/skeleton";
import { Textarea } from "@/modules/jjseguros/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/jjseguros/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/jjseguros/components/ui/tabs";
import { 
  ArrowLeft, 
  Send, 
  User, 
  Mail, 
  Phone, 
  Building, 
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Save,
  RefreshCw,
  StickyNote
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { value: 'not_set', label: 'Não definido' },
  { value: 'novo', label: 'Novo' },
  { value: 'em_contato', label: 'Em Contato' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  cpf: string | null;
  cnpj: string | null;
  person_type: string | null;
  insurance_type: string;
  qar_report: string;
  rd_station_synced: boolean;
  rd_station_error: string | null;
  sync_confirmed_at: string | null;
  funnel_name: string | null;
  funnel_stage: string | null;
  custom_fields: Record<string, unknown>;
  internal_notes: string | null;
}

interface IntegrationLog {
  id: string;
  created_at: string;
  service_name: string;
  status: string;
  error_message: string | null;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  icon: React.ReactNode;
}

function formatQarReport(qar: string): React.ReactNode {
  if (!qar) return <p className="text-muted-foreground">Nenhum relatório disponível</p>;
  
  const lines = qar.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        // Check if line is a section header (ends with :)
        if (trimmedLine.endsWith(':') && !trimmedLine.includes('•')) {
          return (
            <h4 key={index} className="font-semibold text-foreground mt-4 first:mt-0">
              {trimmedLine}
            </h4>
          );
        }
        
        // Check if line is a bullet point
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          const content = trimmedLine.replace(/^[•-]\s*/, '');
          const [label, value] = content.split(':').map(s => s.trim());
          
          if (value) {
            return (
              <div key={index} className="flex gap-2 text-sm pl-4">
                <span className="text-muted-foreground min-w-[140px]">{label}:</span>
                <span className="text-foreground font-medium">{value}</span>
              </div>
            );
          }
          return (
            <p key={index} className="text-sm pl-4 text-foreground">{content}</p>
          );
        }
        
        // Regular line
        return (
          <p key={index} className="text-sm text-foreground">{trimmedLine}</p>
        );
      })}
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const statusColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-gray-400'
  };

  return (
    <div className="relative flex gap-4">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 w-0.5 h-full bg-border" />
      )}
      
      {/* Dot */}
      <div className={`relative z-10 w-6 h-6 rounded-full ${statusColors[event.status]} flex items-center justify-center flex-shrink-0`}>
        <div className="text-white scale-75">
          {event.icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground">{event.title}</h4>
          <Badge variant={event.status === 'success' ? 'default' : event.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
            {event.status === 'success' ? 'Sucesso' : event.status === 'error' ? 'Erro' : 'Pendente'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-1">{event.description}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

export default function AdminLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isResending, setIsResending] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');

  const { data: lead, isLoading: loadingLead, error: leadError, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Lead não encontrado');
      return data as Lead;
    },
    enabled: !!id
  });

  // Sincronizar estado local com dados do lead
  useEffect(() => {
    if (lead) {
      setInternalNotes(lead.internal_notes || '');
      setSelectedStage(lead.funnel_stage || 'not_set');
    }
  }, [lead]);

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['lead-logs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('id, created_at, service_name, status, error_message')
        .eq('lead_id', id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as IntegrationLog[];
    },
    enabled: !!id
  });

  // Mutation para atualizar notas
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ internal_notes: notes })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notas salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
    onError: (error) => {
      console.error('Erro ao salvar notas:', error);
      toast.error('Erro ao salvar notas. Tente novamente.');
    }
  });

  // Mutation para atualizar status do funil
  const updateStageMutation = useMutation({
    mutationFn: async (newStage: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ funnel_stage: newStage })
        .eq('id', id);
      
      if (error) throw error;
      
      // Registrar evento de mudança de status na timeline
      const stageLabel = FUNNEL_STAGES.find(s => s.value === newStage)?.label || newStage;
      await supabase.from('integration_logs').insert({
        lead_id: id,
        service_name: 'status-change',
        status: 'success',
        payload: { old_stage: lead?.funnel_stage, new_stage: newStage },
        error_message: null
      });
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-logs', id] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status. Tente novamente.');
      // Reverter para o status anterior
      setSelectedStage(lead?.funnel_stage || 'not_set');
    }
  });

  const handleStageChange = (newStage: string) => {
    setSelectedStage(newStage);
    updateStageMutation.mutate(newStage);
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(internalNotes);
  };

  const buildTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Lead creation event
    if (lead) {
      events.push({
        id: 'lead-created',
        title: 'Lead Criado',
        description: `Lead cadastrado via formulário de ${lead.insurance_type}`,
        timestamp: lead.created_at,
        status: 'success',
        icon: <User className="w-3 h-3" />
      });
    }

    // Integration logs events
    if (logs) {
      logs.forEach(log => {
        let title = log.service_name;
        let description = '';
        let icon = <Send className="w-3 h-3" />;

        if (log.service_name === 'rd-station' || log.service_name === 'rd_station') {
          title = 'Envio RD Station';
          description = log.status === 'success' 
            ? 'Dados enviados com sucesso para o RD Station'
            : `Falha no envio: ${log.error_message || 'Erro desconhecido'}`;
          icon = <Send className="w-3 h-3" />;
        } else if (log.service_name === 'webhook_n8n' || log.service_name === 'webhook') {
          title = 'Envio Webhook (n8n)';
          description = log.status === 'success'
            ? 'Dados enviados com sucesso para o webhook configurado'
            : `Falha no envio: ${log.error_message || 'Erro desconhecido'}`;
          icon = <Send className="w-3 h-3" />;
        } else if (log.service_name === 'rd-webhook-confirm' || log.service_name === 'rd_webhook') {
          title = 'Callback Recebido';
          description = log.status === 'success'
            ? 'Confirmação recebida via webhook'
            : `Falha na confirmação: ${log.error_message || 'Erro desconhecido'}`;
          icon = <CheckCircle2 className="w-3 h-3" />;
        } else if (log.service_name === 'status-change') {
          title = 'Status Alterado';
          const payload = log.error_message === null ? (log as unknown as { payload?: { new_stage?: string } })?.payload : null;
          const newStageValue = payload?.new_stage || 'desconhecido';
          const newStageLabel = FUNNEL_STAGES.find(s => s.value === newStageValue)?.label || newStageValue;
          description = `Status alterado para "${newStageLabel}"`;
          icon = <RefreshCw className="w-3 h-3" />;
        }

        events.push({
          id: log.id,
          title,
          description,
          timestamp: log.created_at,
          status: log.status === 'success' ? 'success' : 'error',
          icon
        });
      });
    }

    // Sync confirmation event
    if (lead?.sync_confirmed_at) {
      events.push({
        id: 'sync-confirmed',
        title: 'Sincronização Confirmada',
        description: 'Lead confirmado no RD Station via webhook',
        timestamp: lead.sync_confirmed_at,
        status: 'success',
        icon: <CheckCircle2 className="w-3 h-3" />
      });
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  };

  const handleResend = async () => {
    if (!lead) return;

    setIsResending(true);
    try {
      // Montar payload no formato esperado pela Edge Function send-lead
      const payload = {
        contactData: {
          name: lead.name,
          email: lead.email,
          personal_phone: lead.phone,
          city: (lead.custom_fields as Record<string, string>)?.cf_cidade || '',
          state: (lead.custom_fields as Record<string, string>)?.cf_estado || ''
        },
        customFields: lead.custom_fields,
        funnelData: {
          funnel_name: lead.funnel_name || 'Cotação de Seguro',
          funnel_stage: lead.funnel_stage || 'Lead'
        }
      };

      // Usar a Edge Function send-lead que roteia automaticamente
      const { data, error } = await supabase.functions.invoke('send-lead', {
        body: { payload, existingLeadId: lead.id }
      });

      if (error) throw error;

      const destination = data?.destination === 'webhook' ? 'Webhook (n8n)' : 'RD Station';
      toast.success(`Lead reenviado com sucesso para ${destination}!`);
      
      // Atualizar queries
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-logs', id] });
    } catch (error) {
      console.error('Erro ao reenviar lead:', error);
      toast.error('Falha ao reenviar lead. Verifique os logs.');
    } finally {
      setIsResending(false);
    }
  };

  const isLoading = loadingLead || loadingLogs;
  const timelineEvents = buildTimelineEvents();

  if (leadError) {
    return (
      <AdminLayout title="Lead não encontrado">
        <div className="flex flex-col items-center justify-center h-[400px] gap-4">
          <XCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg text-muted-foreground">Lead não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/admin/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Leads
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={lead?.name || "Detalhes do Lead"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/leads')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isLoading ? <Skeleton className="h-8 w-48" /> : lead?.name}
              </h1>
              <p className="text-muted-foreground">Detalhes do Lead</p>
            </div>
          </div>
          
          <Button onClick={handleResend} disabled={isResending || isLoading}>
            {isResending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Enviar Novamente
          </Button>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : lead ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Lead Info & QAR */}
            <div className="space-y-6">
              <Tabs defaultValue="contato" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="contato" className="gap-1.5 text-xs sm:text-sm">
                    <User className="w-4 h-4" />
                    Contato
                  </TabsTrigger>
                  <TabsTrigger value="qar" className="gap-1.5 text-xs sm:text-sm">
                    <FileText className="w-4 h-4" />
                    QAR
                  </TabsTrigger>
                  <TabsTrigger value="gestao" className="gap-1.5 text-xs sm:text-sm">
                    <StickyNote className="w-4 h-4" />
                    Gestão
                  </TabsTrigger>
                </TabsList>

                {/* Tab Contato */}
                <TabsContent value="contato">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Informações do Contato
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm font-medium">{lead.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            <p className="text-sm font-medium">{lead.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {lead.person_type === 'juridica' ? 'CNPJ' : 'CPF'}
                            </p>
                            <p className="text-sm font-medium">{lead.cnpj || lead.cpf || '-'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Ramo</p>
                            <p className="text-sm font-medium capitalize">{lead.insurance_type}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status de Sincronização</span>
                          <Badge variant={lead.rd_station_synced ? 'default' : lead.rd_station_error ? 'destructive' : 'secondary'}>
                            {lead.rd_station_synced ? 'Sincronizado' : lead.rd_station_error ? 'Erro' : 'Pendente'}
                          </Badge>
                        </div>
                        {lead.rd_station_error && (
                          <p className="text-xs text-destructive mt-2">{lead.rd_station_error}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab QAR */}
                <TabsContent value="qar">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Questionário de Avaliação de Risco (QAR)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                        {formatQarReport(lead.qar_report)}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab Gestão */}
                <TabsContent value="gestao">
                  <div className="space-y-6">
                    {/* Funnel Stage */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCw className="w-5 h-5" />
                          Status do Funil
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedStage} onValueChange={handleStageChange} disabled={updateStageMutation.isPending}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            {FUNNEL_STAGES.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    stage.value === 'fechado' ? 'bg-green-500' :
                                    stage.value === 'perdido' ? 'bg-red-500' :
                                    stage.value === 'negociacao' ? 'bg-yellow-500' :
                                    stage.value === 'em_contato' ? 'bg-blue-500' :
                                    'bg-gray-400'
                                  }`} />
                                  {stage.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Internal Notes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <StickyNote className="w-5 h-5" />
                          Notas Internas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          placeholder="Adicione observações internas sobre este lead..."
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                        <Button 
                          onClick={handleSaveNotes} 
                          disabled={updateNotesMutation.isPending}
                          className="w-full"
                        >
                          {updateNotesMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Salvar Notas
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineEvents.length > 0 ? (
                  <div className="space-y-0">
                    {timelineEvents.map((event, index) => (
                      <TimelineItem 
                        key={event.id} 
                        event={event} 
                        isLast={index === timelineEvents.length - 1} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mb-4 opacity-50" />
                    <p>Nenhum evento registrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
