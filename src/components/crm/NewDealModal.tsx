import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCRMDeals, useCRMStages } from '@/hooks/useCRMDeals';
import { useCRMPipelines } from '@/hooks/useCRMPipelines';
import type { CRMStage } from '@/hooks/useCRMDeals';
import { ClientSearchCombobox, type ClientOption } from './ClientSearchCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface NewDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId?: string | null;
  defaultClientId?: string;
  defaultTitle?: string;
  defaultNotes?: string;
}

export function NewDealModal({ open, onOpenChange, defaultStageId, defaultClientId, defaultTitle, defaultNotes }: NewDealModalProps) {
  const { user } = useAuth();
  const { pipelines, isLoading: loadingPipelines } = useCRMPipelines();
  const [pipelineId, setPipelineId] = useState<string>('');
  const { stages, isLoading: loadingStages } = useCRMStages(pipelineId || null);
  const { createDeal, deals } = useCRMDeals(pipelineId || null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    stage_id: '',
    value: '',
    expected_close_date: '',
    notes: ''
  });

  // Auto-select default pipeline when pipelines load
  useEffect(() => {
    if (pipelines.length > 0 && !pipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setPipelineId(defaultPipeline.id);
    }
  }, [pipelines]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: defaultTitle || '',
        client_id: defaultClientId || '',
        stage_id: defaultStageId || '',
        value: '',
        expected_close_date: '',
        notes: defaultNotes || ''
      });
    }
  }, [open, defaultStageId, defaultClientId, defaultTitle, defaultNotes]);

  // Fetch clients when modal opens
  useEffect(() => {
    if (open && user) {
      fetchClients();
    }
  }, [open, user]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, name, phone, email')
        .eq('user_id', user!.id)
        .order('name', { ascending: true })
        .limit(500);

      if (error) throw error;
      
      let clientList = data || [];
      
      // If defaultClientId exists but isn't in the list, fetch individually
      if (defaultClientId && !clientList.find(c => c.id === defaultClientId)) {
        const { data: singleClient } = await supabase
          .from('clientes')
          .select('id, name, phone, email')
          .eq('id', defaultClientId)
          .single();
        
        if (singleClient) {
          clientList = [singleClient, ...clientList];
        }
      }
      
      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Sync deal attributes to Chatwoot in background (non-blocking)
  const syncChatwootInBackground = async (dealId: string) => {
    toast.loading('Sincronizando negócio com Chat Tork...', { id: 'chattork-sync' });
    
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', {
        body: { action: 'sync_deal_attributes', deal_id: dealId }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Negócio sincronizado com Chat Tork!', { id: 'chattork-sync' });
      } else {
        toast.warning(data?.message || 'Sincronização parcial com Chat Tork', { id: 'chattork-sync' });
      }
      console.log('Chat Tork sync completed for deal:', dealId, data);
    } catch (error) {
      console.warn('Chat Tork sync failed (non-blocking):', error);
      toast.warning('Negócio salvo, mas Chat Tork não respondeu', { id: 'chattork-sync' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.stage_id) return;

    setLoading(true);
    try {
      const dealsInStage = deals.filter(d => d.stage_id === formData.stage_id);
      const position = dealsInStage.length;

      const newDeal = await createDeal.mutateAsync({
        title: formData.title,
        client_id: formData.client_id || null,
        stage_id: formData.stage_id,
        value: parseFloat(formData.value) || 0,
        expected_close_date: formData.expected_close_date || null,
        notes: formData.notes || null,
        position
      });

      if (formData.client_id) {
        syncChatwootInBackground(newDeal.id);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineChange = (value: string) => {
    setPipelineId(value);
    setFormData(prev => ({ ...prev, stage_id: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
          <DialogDescription>Adicione um novo negócio ao seu funil de vendas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Renovação Auto - João Silva"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <ClientSearchCombobox
              clients={clients}
              value={formData.client_id}
              onValueChange={(clientId) => setFormData({ ...formData, client_id: clientId })}
              isLoading={loadingClients}
              placeholder="Buscar por nome, telefone ou email..."
            />
          </div>

          {/* Pipeline selector */}
          <div className="space-y-2">
            <Label>Funil de Vendas *</Label>
            <Select value={pipelineId} onValueChange={handlePipelineChange}>
              <SelectTrigger>
                <SelectValue placeholder={loadingPipelines ? "Carregando..." : "Selecione o funil"} />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.is_default ? ' (padrão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Etapa *</Label>
            <Select
              value={formData.stage_id}
              onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStages ? "Carregando..." : "Selecione a etapa"} />
              </SelectTrigger>
              <SelectContent>
                {loadingStages ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando etapas...
                    </div>
                  </SelectItem>
                ) : !stages || stages.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhuma etapa encontrada
                  </SelectItem>
                ) : (
                  stages.map((stage: CRMStage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Previsão Fechamento</Label>
              <Input
                id="date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Anotações sobre o negócio..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingStages || !formData.title || !formData.stage_id}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Criar Negócio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
