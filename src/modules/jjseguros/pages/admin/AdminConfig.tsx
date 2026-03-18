import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Check, Copy, Key, Link2, Trash2, HelpCircle, AlertTriangle, Radio, ChevronDown, ChevronUp, Settings, Send, Loader2, FileText, Target, Eye, EyeOff, Plus, Power } from 'lucide-react';
import { AdminLayout } from '@/modules/jjseguros/components/admin/AdminLayout';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/jjseguros/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/jjseguros/components/ui/tabs';
import { Button } from '@/modules/jjseguros/components/ui/button';
import { Input } from '@/modules/jjseguros/components/ui/input';
import { useToast } from '@/modules/jjseguros/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/modules/jjseguros/components/ui/alert';
import { Badge } from '@/modules/jjseguros/components/ui/badge';
import { ScrollArea } from '@/modules/jjseguros/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/modules/jjseguros/components/ui/collapsible';
import { Label } from '@/modules/jjseguros/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/jjseguros/components/ui/select';
import { Switch } from '@/modules/jjseguros/components/ui/switch';
import { getSettings, saveSettings, isValidUrl, IntegrationSettings, getDestinations, addDestination, updateDestination, deleteDestination, IntegrationDestination } from '@/modules/jjseguros/utils/settings';
import { HealthQualificationConfig } from '@/modules/jjseguros/components/admin/HealthQualificationConfig';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/modules/jjseguros/components/ui/alert-dialog';

const SUPABASE_PROJECT_ID = 'jrbknkrkhyoobkpdyaay';
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/rd-webhook-confirm`;

interface IntegrationLog {
  id: string;
  service_name: string;
  status: string;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

const DESTINATION_TYPE_LABELS: Record<string, string> = {
  rd_crm: 'RD CRM',
  rd_marketing: 'RD Marketing',
  webhook: 'Webhook',
};

export default function AdminConfig() {
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState<IntegrationLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  // Marketing settings state
  const [metaPixelId, setMetaPixelId] = useState('');
  const [metaCapiToken, setMetaCapiToken] = useState('');
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [isSavingMarketing, setIsSavingMarketing] = useState(false);
  const [isTestingMeta, setIsTestingMeta] = useState(false);

  // QAR test state
  const [selectedQarType, setSelectedQarType] = useState<string>('auto');
  const [isSendingQar, setIsSendingQar] = useState(false);

  // Add destination state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDestName, setNewDestName] = useState('');
  const [newDestType, setNewDestType] = useState<'rd_crm' | 'rd_marketing' | 'webhook'>('webhook');
  const [newDestUrl, setNewDestUrl] = useState('');
  const [isAddingDest, setIsAddingDest] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch destinations
  const { data: destinations = [], isLoading: isLoadingDestinations } = useQuery({
    queryKey: ['integration-destinations'],
    queryFn: getDestinations,
  });

  // Buscar últimos logs ao carregar
  const { data: initialLogs } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as IntegrationLog[];
    },
  });

  useEffect(() => {
    if (initialLogs && realtimeLogs.length === 0) {
      setRealtimeLogs(initialLogs);
    }
  }, [initialLogs, realtimeLogs.length]);

  // Realtime subscription
  useEffect(() => {
    if (!isListening) return;

    const channel = supabase
      .channel('webhook-debugger')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'integration_logs',
        },
        (payload) => {
          const newLog = payload.new as IntegrationLog;
          setRealtimeLogs((prev) => [newLog, ...prev].slice(0, 20));
          toast({
            title: 'Novo log de integração',
            description: `${newLog.service_name}: ${newLog.status}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isListening, toast]);

  const toggleListening = () => {
    setIsListening((prev) => !prev);
    toast({
      title: isListening ? 'Monitoramento pausado' : 'Monitoramento ativo',
      description: isListening 
        ? 'Você não receberá mais atualizações em tempo real.' 
        : 'Logs serão exibidos automaticamente.',
    });
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'URL do webhook copiada para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
  };

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { error } = await supabase
        .from('integration_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Limpeza concluída',
        description: 'Logs antigos foram removidos com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
    },
    onError: () => {
      toast({
        title: 'Erro na limpeza',
        description: 'Não foi possível limpar os logs antigos.',
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch integration settings (for marketing)
  const { data: integrationSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['integration-settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (integrationSettings) {
      setMetaPixelId(integrationSettings.meta_pixel_id || '');
      setMetaCapiToken(integrationSettings.meta_capi_token || '');
    }
  }, [integrationSettings]);

  // ═══════ Destination handlers ═══════

  const handleAddDestination = async () => {
    if (!newDestName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    if (newDestType === 'webhook' && !isValidUrl(newDestUrl)) {
      toast({ title: 'URL inválida', description: 'Informe uma URL válida para o webhook.', variant: 'destructive' });
      return;
    }

    setIsAddingDest(true);
    const result = await addDestination({
      name: newDestName.trim(),
      type: newDestType,
      webhook_url: newDestType === 'webhook' ? newDestUrl : null,
    });

    if (result) {
      toast({ title: 'Destino adicionado', description: `"${result.name}" criado com sucesso.` });
      setNewDestName('');
      setNewDestUrl('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['integration-destinations'] });
    } else {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' });
    }
    setIsAddingDest(false);
  };

  const handleToggleDestination = async (dest: IntegrationDestination) => {
    const success = await updateDestination(dest.id, { is_active: !dest.is_active });
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['integration-destinations'] });
    } else {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleDeleteDestination = async (dest: IntegrationDestination) => {
    const success = await deleteDestination(dest.id);
    if (success) {
      toast({ title: 'Destino removido', description: `"${dest.name}" foi removido.` });
      queryClient.invalidateQueries({ queryKey: ['integration-destinations'] });
    } else {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleTestDestination = async (dest: IntegrationDestination) => {
    const testPayload = {
      name: 'Teste de Conexão',
      email: 'teste@exemplo.com',
      phone: '11999999999',
      source: 'Painel Admin - Teste',
      timestamp: new Date().toISOString(),
    };

    try {
      if (dest.type === 'webhook') {
        if (!dest.webhook_url) {
          toast({ title: 'URL não configurada', variant: 'destructive' });
          return;
        }
        const response = await fetch(dest.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        });
        if (response.ok) {
          toast({ title: 'Sucesso', description: `"${dest.name}" respondeu corretamente.` });
        } else {
          toast({ title: 'Erro', description: `Retornou status ${response.status}`, variant: 'destructive' });
        }
      } else if (dest.type === 'rd_crm') {
        const { error } = await supabase.functions.invoke('rd-crm', {
          body: {
            contactData: { name: testPayload.name, email: testPayload.email, personal_phone: testPayload.phone },
            customFields: { cf_tipo_solicitacao_seguro: 'Teste Admin' },
          },
        });
        if (error) {
          toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Sucesso', description: 'RD CRM recebeu os dados.' });
        }
      } else if (dest.type === 'rd_marketing') {
        const { error } = await supabase.functions.invoke('rd-station', {
          body: {
            contactData: { name: testPayload.name, email: testPayload.email, personal_phone: testPayload.phone },
            customFields: { cf_tipo_solicitacao_seguro: 'Teste Admin' },
          },
        });
        if (error) {
          toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Sucesso', description: 'RD Marketing recebeu os dados.' });
        }
      }
    } catch {
      toast({ title: 'Erro de Conexão', description: 'Não foi possível conectar ao destino.', variant: 'destructive' });
    }
  };

  // Marketing handlers
  const handleSaveMarketingSettings = async () => {
    setIsSavingMarketing(true);
    const success = await saveSettings({
      meta_pixel_id: metaPixelId || null,
      meta_capi_token: metaCapiToken || null,
    });
    if (success) {
      toast({ title: 'Configurações salvas', description: 'Configurações de marketing atualizadas.' });
      queryClient.invalidateQueries({ queryKey: ['integration-settings'] });
    } else {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
    setIsSavingMarketing(false);
  };

  const handleTestMeta = async () => {
    if (!metaPixelId) {
      toast({ title: 'Pixel ID obrigatório', variant: 'destructive' });
      return;
    }
    setIsTestingMeta(true);
    try {
      await saveSettings({ meta_pixel_id: metaPixelId || null, meta_capi_token: metaCapiToken || null });
      const testCode = 'TEST' + Date.now().toString().slice(-5);
      const { data, error } = await supabase.functions.invoke('meta-capi', {
        body: {
          event_name: 'PageView',
          email: 'teste@admin.local',
          phone: '11999999999',
          name: 'Teste Admin',
          city: 'São Paulo',
          state: 'SP',
          event_source_url: window.location.href,
          test_event_code: testCode,
        },
      });
      if (error) {
        toast({ title: 'Erro no teste', description: error.message, variant: 'destructive' });
      } else if (data?.success) {
        toast({ title: 'Teste enviado!', description: 'Evento PageView enviado para Meta CAPI.' });
      } else {
        toast({ title: 'Resposta da Meta', description: data?.error || 'Verifique os logs.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    }
    setIsTestingMeta(false);
  };

  // ═══════ QAR Test ═══════
  const generateQarPayload = (type: string) => {
    const SEPARATOR = '───────────────────────';
    const timestamp = new Date().toISOString();
    
    const payloads: Record<string, any> = {
      auto: {
        name: 'João Carlos da Silva',
        email: 'joao.silva@email.com',
        personal_phone: '11987654321',
        city: 'São Paulo',
        state: 'SP',
        cf_tipo_solicitacao_seguro: 'Seguro Auto',
        cf_deal_type: 'Seguro Novo',
        cf_qar_auto: `NOVO LEAD: SEGURO AUTO\n${SEPARATOR}\nNome: João Carlos da Silva\nChamar: https://wa.me/5511987654321\n${SEPARATOR}\n\nTIPO SOLICITACAO: Seguro Novo\n\nDADOS DO CONDUTOR:\nNome: João Carlos da Silva\nTipo: Pessoa Fisica\nCPF: 123.456.789-00\n\nDADOS DO VEICULO:\nModelo: Honda Civic EXL 2.0 2024\nPlaca: ABC1D23\n\n${SEPARATOR}\nCONTATO:\nEmail: joao.silva@email.com\nTelefone: 11987654321`,
        funnel: { funnel_name: '1-Auto', funnel_stage: 'AGR Cotacao' },
      },
      residencial: {
        name: 'Maria Fernanda Costa',
        email: 'maria.costa@email.com',
        personal_phone: '21998765432',
        city: 'Rio de Janeiro',
        state: 'RJ',
        cf_tipo_solicitacao_seguro: 'Seguro Residencial',
        cf_qar_residencial: `NOVO LEAD: SEGURO RESIDENCIAL\n${SEPARATOR}\nNome: Maria Fernanda Costa\n\nDADOS DO IMOVEL:\nTipo: Apartamento\n\n${SEPARATOR}\nCONTATO:\nEmail: maria.costa@email.com\nTelefone: 21998765432`,
        funnel: { funnel_name: '2-Residencial', funnel_stage: 'AGR Cotacao' },
      },
      vida: {
        name: 'Carlos Eduardo Santos',
        email: 'carlos.santos@email.com',
        personal_phone: '31987654321',
        city: 'Belo Horizonte',
        state: 'MG',
        cf_tipo_solicitacao_seguro: 'Seguro de Vida',
        cf_qar_vida: `NOVO LEAD: SEGURO DE VIDA\n${SEPARATOR}\nNome: Carlos Eduardo Santos\n\n${SEPARATOR}\nCONTATO:\nEmail: carlos.santos@email.com\nTelefone: 31987654321`,
        funnel: { funnel_name: '3-Vida', funnel_stage: 'AGR Cotacao' },
      },
      empresarial: {
        name: 'Tech Solutions LTDA',
        email: 'contato@techsolutions.com.br',
        personal_phone: '11912345678',
        city: 'São Paulo',
        state: 'SP',
        cf_tipo_solicitacao_seguro: 'Seguro Empresarial',
        cf_qar_empresarial: `NOVO LEAD: SEGURO EMPRESARIAL\n${SEPARATOR}\nNome: Tech Solutions LTDA\n\n${SEPARATOR}\nCONTATO:\nEmail: contato@techsolutions.com.br\nTelefone: 11912345678`,
        funnel: { funnel_name: '4-Business', funnel_stage: 'AGR Cotacao' },
      },
      viagem: {
        name: 'Ana Paula Oliveira',
        email: 'ana.oliveira@email.com',
        personal_phone: '41987654321',
        city: 'Curitiba',
        state: 'PR',
        cf_tipo_solicitacao_seguro: 'Seguro Viagem',
        cf_qar_viagem: `NOVO LEAD: SEGURO VIAGEM\n${SEPARATOR}\nNome: Ana Paula Oliveira\n\n${SEPARATOR}\nCONTATO:\nEmail: ana.oliveira@email.com\nTelefone: 41987654321`,
        funnel: { funnel_name: '5-Viagem', funnel_stage: 'AGR Cotacao' },
      },
      saude: {
        name: 'Fernando Henrique Lima',
        email: 'fernando.lima@email.com',
        personal_phone: '51987654321',
        city: 'Porto Alegre',
        state: 'RS',
        cf_tipo_solicitacao_seguro: 'Plano de Saúde',
        cf_qar_saude: `NOVO LEAD: PLANO DE SAUDE\n${SEPARATOR}\nNome: Fernando Henrique Lima\n\n${SEPARATOR}\nCONTATO:\nEmail: fernando.lima@email.com\nTelefone: 51987654321`,
        funnel: { funnel_name: '6-Saude', funnel_stage: 'AGR Cotacao' },
      },
      smartphone: {
        name: 'Gabriela Mendes',
        email: 'gabriela.mendes@email.com',
        personal_phone: '61987654321',
        city: 'Brasília',
        state: 'DF',
        cf_tipo_solicitacao_seguro: 'Seguro Residencial',
        cf_qar_residencial: `NOVO LEAD: SEGURO SMARTPHONE (VIA RESIDENCIAL)\n${SEPARATOR}\nNome: Gabriela Mendes\n\n${SEPARATOR}\nCONTATO:\nEmail: gabriela.mendes@email.com\nTelefone: 61987654321`,
        funnel: { funnel_name: '2-Residencial', funnel_stage: 'AGR Cotacao' },
      },
    };

    const payload = payloads[type] || payloads.auto;
    return {
      ...payload,
      cf_qar_respondido: payload.cf_qar_auto || payload.cf_qar_residencial || payload.cf_qar_vida || payload.cf_qar_empresarial || payload.cf_qar_viagem || payload.cf_qar_saude,
      timestamp,
      source: 'JJ Seguros - Teste Admin Panel',
    };
  };

  const handleSendQarTest = async () => {
    setIsSendingQar(true);
    const payload = generateQarPayload(selectedQarType);

    // Send to all active destinations
    const activeDestinations = destinations.filter(d => d.is_active);

    if (activeDestinations.length === 0) {
      toast({ title: 'Nenhum destino ativo', description: 'Adicione e ative pelo menos um destino.', variant: 'destructive' });
      setIsSendingQar(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const dest of activeDestinations) {
      try {
        if (dest.type === 'webhook') {
          if (!dest.webhook_url) { errorCount++; continue; }
          const response = await fetch(dest.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (response.ok) successCount++;
          else errorCount++;
        } else if (dest.type === 'rd_crm') {
          const { error } = await supabase.functions.invoke('rd-crm', {
            body: {
              contactData: { name: payload.name, email: payload.email, personal_phone: payload.personal_phone, city: payload.city, state: payload.state },
              customFields: { cf_tipo_solicitacao_seguro: payload.cf_tipo_solicitacao_seguro, cf_qar_respondido: payload.cf_qar_respondido },
              funnelData: payload.funnel,
            },
          });
          if (error) errorCount++;
          else successCount++;
        } else if (dest.type === 'rd_marketing') {
          const { error } = await supabase.functions.invoke('rd-station', {
            body: {
              contactData: { name: payload.name, email: payload.email, personal_phone: payload.personal_phone, city: payload.city, state: payload.state },
              customFields: { cf_tipo_solicitacao_seguro: payload.cf_tipo_solicitacao_seguro, cf_qar_respondido: payload.cf_qar_respondido },
              funnelData: payload.funnel,
            },
          });
          if (error) errorCount++;
          else successCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'QAR Enviado!',
        description: `${successCount} destino(s) OK${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
      });
    } else {
      toast({ title: 'Erro no Envio', description: 'Nenhum destino respondeu com sucesso.', variant: 'destructive' });
    }

    setIsSendingQar(false);
  };

  return (
    <AdminLayout title="Configurações">
      <Tabs defaultValue="integracao" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6">
          <TabsTrigger value="integracao" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Integração</span>
            <span className="sm:hidden">Integr.</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-1.5 text-xs sm:text-sm">
            <Target className="h-4 w-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="testes" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            Testes
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5 text-xs sm:text-sm">
            <Trash2 className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* ═══════ TAB 1: INTEGRAÇÃO (DESTINOS) ═══════ */}
        <TabsContent value="integracao" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Destinos de Integração
                  </CardTitle>
                  <CardDescription>
                    Configure para onde os leads serão enviados. Múltiplos destinos disparam em paralelo.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" variant={showAddForm ? 'secondary' : 'default'}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Form */}
              {showAddForm && (
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                  <p className="text-sm font-medium">Novo Destino</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        placeholder="Ex: Webhook n8n, RD CRM Prod"
                        value={newDestName}
                        onChange={(e) => setNewDestName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newDestType} onValueChange={(v) => setNewDestType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rd_crm">RD CRM (API direta)</SelectItem>
                          <SelectItem value="rd_marketing">RD Marketing (API direta)</SelectItem>
                          <SelectItem value="webhook">Webhook (n8n, Make, Zapier)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {newDestType === 'webhook' && (
                    <div className="space-y-1">
                      <Label className="text-xs">URL do Webhook</Label>
                      <Input
                        type="url"
                        placeholder="https://seu-webhook.exemplo.com/endpoint"
                        value={newDestUrl}
                        onChange={(e) => setNewDestUrl(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddDestination} disabled={isAddingDest}>
                      {isAddingDest ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Destinations list */}
              {isLoadingDestinations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : destinations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum destino configurado.</p>
                  <p className="text-xs mt-1">Clique em "Adicionar" para criar o primeiro destino.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {destinations.map((dest) => (
                    <div
                      key={dest.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        dest.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={dest.is_active}
                          onCheckedChange={() => handleToggleDestination(dest)}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{dest.name}</p>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {DESTINATION_TYPE_LABELS[dest.type] || dest.type}
                            </Badge>
                          </div>
                          {dest.type === 'webhook' && dest.webhook_url && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                              {dest.webhook_url}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button size="sm" variant="ghost" onClick={() => handleTestDestination(dest)}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover destino</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover "{dest.name}"? Leads não serão mais enviados para este destino.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDestination(dest)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Todos os destinos ativos recebem o lead em paralelo. Se um destino falhar, os outros continuam funcionando.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* API Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Status da API
              </CardTitle>
              <CardDescription>
                Chaves de API configuradas no Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">RD_API_KEY</p>
                  <p className="text-sm text-muted-foreground">Chave de API do RD Station</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-background px-2 py-1 rounded">****</span>
                  <span className="text-green-600 text-sm font-medium">Configurada</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">RD_WEBHOOK_TOKEN</p>
                  <p className="text-sm text-muted-foreground">Token de validação do webhook</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-background px-2 py-1 rounded">****</span>
                  <span className="text-green-600 text-sm font-medium">Configurada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB 2: MARKETING ═══════ */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meta Pixel & CAPI
              </CardTitle>
              <CardDescription>
                Configure tracking de conversão com Meta (Facebook/Instagram).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="meta-pixel-id">Meta Pixel ID</Label>
                    <Input id="meta-pixel-id" type="text" placeholder="Ex: 123456789012345" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} className="font-mono" />
                    <p className="text-xs text-muted-foreground">Encontre em: Gerenciador de Eventos → Fontes de Dados → Seu Pixel</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-capi-token">Meta CAPI Token (Access Token)</Label>
                    <div className="flex gap-2">
                      <Input id="meta-capi-token" type={showCapiToken ? 'text' : 'password'} placeholder="EAAG..." value={metaCapiToken} onChange={(e) => setMetaCapiToken(e.target.value)} className="font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowCapiToken(!showCapiToken)}>
                        {showCapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Token de acesso para Conversions API. Mantenha em segredo!</p>
                  </div>
                  <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Leads desqualificados NÃO disparam eventos de conversão no Meta Pixel, mas ainda são salvos no banco de dados.
                    </AlertDescription>
                  </Alert>
                  <div className="pt-4 border-t flex gap-3">
                    <Button onClick={handleSaveMarketingSettings} disabled={isSavingMarketing}>
                      {isSavingMarketing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Configurações'}
                    </Button>
                    <Button variant="outline" onClick={handleTestMeta} disabled={isTestingMeta || !metaPixelId}>
                      {isTestingMeta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testando...</> : <><Send className="mr-2 h-4 w-4" />Testar Pixel/CAPI</>}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <HealthQualificationConfig 
            settings={integrationSettings} 
            isLoading={isLoadingSettings}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['integration-settings'] })}
          />
        </TabsContent>

        {/* ═══════ TAB 3: TESTES ═══════ */}
        <TabsContent value="testes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Enviar QAR de Teste
              </CardTitle>
              <CardDescription>
                Envia um payload real de cotação para todos os destinos ativos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="qar-type">Tipo de Seguro</Label>
                  <Select value={selectedQarType} onValueChange={setSelectedQarType}>
                    <SelectTrigger id="qar-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🚗 Seguro Auto</SelectItem>
                      <SelectItem value="residencial">🏠 Seguro Residencial</SelectItem>
                      <SelectItem value="vida">❤️ Seguro de Vida</SelectItem>
                      <SelectItem value="empresarial">🏢 Seguro Empresarial</SelectItem>
                      <SelectItem value="viagem">✈️ Seguro Viagem</SelectItem>
                      <SelectItem value="saude">🏥 Plano de Saúde</SelectItem>
                      <SelectItem value="smartphone">📱 Seguro Smartphone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSendQarTest} disabled={isSendingQar} className="shrink-0">
                  {isSendingQar ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <><Send className="mr-2 h-4 w-4" />Enviar QAR Teste</>}
                </Button>
              </div>
              <Alert>
                <AlertDescription className="text-sm">
                  Destinos ativos: <strong>{destinations.filter(d => d.is_active).map(d => d.name).join(', ') || 'Nenhum'}</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Webhook Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Endpoints de Webhook
              </CardTitle>
              <CardDescription>
                URLs para configurar no RD Station e outras integrações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">URL de Confirmação do Webhook</label>
                <div className="flex gap-2">
                  <Input value={WEBHOOK_URL} readOnly className="font-mono text-sm bg-muted" />
                  <Button variant="outline" onClick={copyToClipboard} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Use com o parâmetro <code className="bg-muted px-1 rounded">?token=SEU_TOKEN</code>
                </p>
              </div>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Como configurar no RD Station</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse <strong>Configurações → Integrações → Webhooks</strong> no RD Station</li>
                    <li>Clique em "Adicionar webhook"</li>
                    <li>Cole a URL acima no campo "URL do webhook"</li>
                    <li>Adicione o token: <code className="bg-muted px-1 rounded">?token=SEU_RD_WEBHOOK_TOKEN</code></li>
                    <li>Selecione o evento "Conversão"</li>
                    <li>Salve e teste a integração</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Integration Debugger */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Integration Debugger
              </CardTitle>
              <CardDescription>
                Monitore logs de integração em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={isListening ? 'default' : 'outline'}
                  onClick={toggleListening}
                  className="relative"
                >
                  {isListening && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                  <Radio className="mr-2 h-4 w-4" />
                  {isListening ? 'Ouvindo...' : 'Ouvir Logs'}
                </Button>
                {isListening && (
                  <span className="text-sm text-muted-foreground">Aguardando novos logs...</span>
                )}
              </div>
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/50">
                  <p className="text-sm font-medium">Últimos Logs</p>
                </div>
                <ScrollArea className="h-[300px]">
                  {realtimeLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum log encontrado.</p>
                      <p className="text-xs mt-1">Ative o monitoramento e aguarde.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {realtimeLogs.map((log) => (
                        <Collapsible
                          key={log.id}
                          open={expandedLogs.has(log.id)}
                          onOpenChange={() => toggleExpanded(log.id)}
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={log.status === 'success' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {log.status === 'success' ? 'OK' : 'ERR'}
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground">{log.service_name}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {expandedLogs.has(log.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            {log.error_message && (
                              <p className="text-sm text-destructive mt-1">{log.error_message}</p>
                            )}
                            <CollapsibleContent>
                              <div className="mt-3 space-y-2">
                                {log.payload && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Payload</p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.payload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.response && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.response, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB 4: SISTEMA ═══════ */}
        <TabsContent value="sistema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Manutenção
              </CardTitle>
              <CardDescription>
                Ferramentas para manutenção e limpeza do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Limpar logs antigos</p>
                  <p className="text-sm text-muted-foreground">
                    Remove logs de integração com mais de 30 dias.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={cleanupMutation.isPending}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {cleanupMutation.isPending ? 'Limpando...' : 'Limpar'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Confirmar limpeza
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover permanentemente todos os logs de integração com mais de 30 dias. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cleanupMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmar limpeza
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
