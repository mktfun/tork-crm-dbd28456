
import React, { useState, useEffect } from 'react';
import { Bot, Save, Info, Sparkles, ArrowRight, Target, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStages } from '@/hooks/useCRMDeals'; // Para listar etapas de destino
import { ConfigSourceBadge, determineConfigSource, getConfigSourceDescription } from './ConfigSourceBadge';

interface StageAIConfigPanelProps {
  stage: { id: string; name: string; color: string; pipeline_id: string } | null;
  aiSetting: any;
  globalConfig: any;
  pipelineDefault?: any;
  onSave: (data: any) => Promise<void>;
  onResetToDefault?: (stageId: string) => Promise<void>;
  isSaving?: boolean;
}

export function StageAIConfigPanel({
  stage,
  aiSetting,
  globalConfig,
  pipelineDefault,
  onSave,
  onResetToDefault,
  isSaving = false,
}: StageAIConfigPanelProps) {
  // Config States
  const [isActive, setIsActive] = useState(false);
  const [aiObjective, setAiObjective] = useState('');
  const [aiPersona, setAiPersona] = useState(''); // Instruções de tom/estilo
  const [completionActionType, setCompletionActionType] = useState('notify');
  const [targetStageId, setTargetStageId] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch stages for "Move Action" dropdown
  const { stages: pipelineStages } = useCRMStages(stage?.pipeline_id);

  // Load Initial Values
  useEffect(() => {
    if (!stage) return;

    // Load from settings or defaults
    setIsActive(aiSetting?.is_active ?? false);
    setAiObjective(aiSetting?.ai_objective ?? '');
    setAiPersona(aiSetting?.ai_persona ?? pipelineDefault?.ai_persona ?? globalConfig?.base_instructions ?? '');

    // Parse Completion Action (JSON)
    // Ex: { type: "move_stage", target_stage_id: "..." }
    if (aiSetting?.ai_completion_action) {
      try {
        const action = typeof aiSetting.ai_completion_action === 'string'
          ? JSON.parse(aiSetting.ai_completion_action)
          : aiSetting.ai_completion_action;
        setCompletionActionType(action.type || 'notify');
        setTargetStageId(action.target_stage_id || '');
      } catch (e) {
        console.error("Error parsing completion action", e);
      }
    } else {
      setCompletionActionType('notify');
      setTargetStageId('');
    }

    setHasChanges(false);
  }, [stage?.id, aiSetting, pipelineDefault, globalConfig]);

  // Track Changes
  useEffect(() => {
    setHasChanges(true); // Simplificação: qualquer edição marca como alterado para habilitar botão salvar
  }, [isActive, aiObjective, aiPersona, completionActionType, targetStageId]);

  const handleSave = async () => {
    if (!stage) return;

    const completionAction = completionActionType === 'move_stage'
      ? { type: 'move_stage', target_stage_id: targetStageId }
      : { type: 'notify' };

    await onSave({
      stage_id: stage.id,
      is_active: isActive,
      ai_objective: aiObjective,
      ai_persona: aiPersona,
      ai_completion_action: JSON.stringify(completionAction) // Serializar para salvar
    });
    setHasChanges(false);
  };

  if (!stage) return <div className="p-8 text-center text-muted-foreground">Selecione uma etapa para configurar.</div>;

  return (
    <div className="flex flex-col h-full bg-zinc-950/30 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold">{stage.name}</h3>
        </div>
        <div className="flex gap-2">
          {onResetToDefault && <Button variant="ghost" size="sm" onClick={() => onResetToDefault(stage.id)}><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving} className={hasChanges ? "bg-emerald-600 hover:bg-emerald-500" : ""}>
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Activation Switch */}
        <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border/50">
          <div className="flex gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-background border border-border", isActive ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground")}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <Label className="text-base">Agente de IA</Label>
              <p className="text-xs text-muted-foreground">O agente deve atuar nesta etapa?</p>
            </div>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {isActive && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">

            {/* OBJETIVO (Core Concept) */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-emerald-400">
                <Target className="h-4 w-4" />
                Objetivo da IA nesta Etapa
              </Label>
              <Alert className="bg-emerald-950/10 border-emerald-500/20 text-emerald-300">
                <AlertDescription className="text-xs">
                  Descreva claramente o que a IA deve tentar conseguir. Ex: "Descobrir o orçamento do cliente" ou "Agendar uma demo".
                </AlertDescription>
              </Alert>
              <Textarea
                placeholder="Ex: O objetivo é qualificar o lead. Pergunte o nome da empresa, cargo e tamanho da equipe. Só avance se tiver essas 3 informações."
                className="min-h-[100px] bg-background/50 font-medium"
                value={aiObjective}
                onChange={(e) => setAiObjective(e.target.value)}
              />
            </div>

            {/* AÇÃO DE CONCLUSÃO */}
            <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-muted/10">
              <Label className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Ao atingir o objetivo...
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={completionActionType} onValueChange={setCompletionActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notify">Apenas Notificar/Parar</SelectItem>
                    <SelectItem value="move_stage">Mover para outra Etapa</SelectItem>
                  </SelectContent>
                </Select>

                {completionActionType === 'move_stage' && (
                  <Select value={targetStageId} onValueChange={setTargetStageId}>
                    <SelectTrigger className="border-emerald-500/30">
                      <SelectValue placeholder="Qual etapa?" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* PERSONALIDADE (Advanced) */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                <Sparkles className="h-3 w-3" />
                Instruções de Personalidade (Opcional - Sobrescreve Global)
              </Label>
              <Textarea
                placeholder="Ex: Seja extremamente formal e jurídico."
                className="bg-background/30 text-xs h-20"
                value={aiPersona}
                onChange={(e) => setAiPersona(e.target.value)}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
