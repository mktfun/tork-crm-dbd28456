import React, { useState, useEffect } from 'react';
import { useCRMStages } from '@/hooks/useCRMDeals';
import { Proposal, ProposalOption } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { format, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ProposalSettingsFormProps {
  dealId: string | null;
  pipelineId?: string | null;
  clientName?: string;
  initialOptions: Partial<ProposalOption>[];
  onSave: (data: Partial<Proposal>) => Promise<void>;
}

export function ProposalSettingsForm({ dealId, pipelineId, clientName, initialOptions, onSave }: ProposalSettingsFormProps) {
  const { stages, isLoading: loadingStages } = useCRMStages(pipelineId || null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState(`Proposta Auto - ${clientName || 'Cliente'}`);
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 15), 'yyyy-MM-dd'));
  const [acceptedStageId, setAcceptedStageId] = useState<string>('none');
  const [rejectedStageId, setRejectedStageId] = useState<string>('none');
  const [enableComparison, setEnableComparison] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title,
        valid_until: validUntil,
        accepted_stage_id: acceptedStageId !== 'none' ? acceptedStageId : null,
        rejected_stage_id: rejectedStageId !== 'none' ? rejectedStageId : null,
        enable_comparison: enableComparison
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border p-5 rounded-2xl space-y-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Configurações da Proposta</h3>
          <p className="text-sm text-muted-foreground">
            Defina o título, validade e regras de automação para esta proposta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título da Proposta</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ex: Proposta Auto - João"
            />
          </div>

          <div className="space-y-2">
            <Label>Válido até</Label>
            <Input 
              type="date" 
              value={validUntil} 
              onChange={(e) => setValidUntil(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Ao Aceitar, mover Deal para:</Label>
            <Select value={acceptedStageId} onValueChange={setAcceptedStageId} disabled={loadingStages}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não mover</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ao Recusar, mover Deal para:</Label>
            <Select value={rejectedStageId} onValueChange={setRejectedStageId} disabled={loadingStages}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não mover</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Ativar Comparativo</Label>
            <p className="text-xs text-muted-foreground">
              Mostra uma tabela comparando estas opções com a apólice anterior do cliente (se houver).
            </p>
          </div>
          <Switch checked={enableComparison} onCheckedChange={setEnableComparison} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[150px]">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSaving ? 'Gerando...' : 'Gerar Proposta Final'}
        </Button>
      </div>
    </div>
  );
}
