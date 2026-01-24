import React, { useState, useEffect } from 'react';
import { Bot, Save, Sparkles, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface StageAIConfigPanelProps {
  stage: {
    id: string;
    name: string;
    color: string;
  } | null;
  aiSetting: {
    ai_name?: string;
    ai_persona?: string;
    ai_objective?: string;
    ai_custom_rules?: string;
    is_active?: boolean;
    max_messages_before_human?: number;
  } | null;
  globalConfig: {
    agent_name: string;
    voice_tone: string;
    base_instructions: string;
  } | null;
  onSave: (data: {
    stage_id: string;
    ai_name?: string;
    ai_persona?: string;
    ai_objective?: string;
    ai_custom_rules?: string;
    is_active?: boolean;
    max_messages_before_human?: number;
  }) => Promise<void>;
  isSaving?: boolean;
}

export function StageAIConfigPanel({
  stage,
  aiSetting,
  globalConfig,
  onSave,
  isSaving = false,
}: StageAIConfigPanelProps) {
  const [aiName, setAiName] = useState('');
  const [aiPersona, setAiPersona] = useState('');
  const [aiObjective, setAiObjective] = useState('');
  const [aiCustomRules, setAiCustomRules] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [maxMessages, setMaxMessages] = useState(10);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when stage changes
  useEffect(() => {
    if (aiSetting) {
      setAiName(aiSetting.ai_name || globalConfig?.agent_name || '');
      setAiPersona(aiSetting.ai_persona || '');
      setAiObjective(aiSetting.ai_objective || '');
      setAiCustomRules(aiSetting.ai_custom_rules || '');
      setIsActive(aiSetting.is_active ?? false);
      setMaxMessages(aiSetting.max_messages_before_human ?? 10);
    } else {
      setAiName(globalConfig?.agent_name || '');
      setAiPersona('');
      setAiObjective('');
      setAiCustomRules('');
      setIsActive(false);
      setMaxMessages(10);
    }
    setHasChanges(false);
  }, [stage?.id, aiSetting, globalConfig]);

  // Track changes
  useEffect(() => {
    if (!stage) return;
    
    const originalName = aiSetting?.ai_name || globalConfig?.agent_name || '';
    const originalPersona = aiSetting?.ai_persona || '';
    const originalObjective = aiSetting?.ai_objective || '';
    const originalRules = aiSetting?.ai_custom_rules || '';
    const originalActive = aiSetting?.is_active ?? false;
    const originalMaxMessages = aiSetting?.max_messages_before_human ?? 10;

    const changed = 
      aiName !== originalName ||
      aiPersona !== originalPersona ||
      aiObjective !== originalObjective ||
      aiCustomRules !== originalRules ||
      isActive !== originalActive ||
      maxMessages !== originalMaxMessages;

    setHasChanges(changed);
  }, [aiName, aiPersona, aiObjective, aiCustomRules, isActive, maxMessages, aiSetting, globalConfig, stage]);

  const handleSave = async () => {
    if (!stage) return;
    
    await onSave({
      stage_id: stage.id,
      ai_name: aiName.trim() || undefined,
      ai_persona: aiPersona.trim() || undefined,
      ai_objective: aiObjective.trim() || undefined,
      ai_custom_rules: aiCustomRules.trim() || undefined,
      is_active: isActive,
      max_messages_before_human: maxMessages,
    });
    setHasChanges(false);
  };

  if (!stage) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Selecione uma Etapa
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma etapa do funil na lista lateral para configurar o DNA do agente de IA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-background"
            style={{ backgroundColor: stage.color, boxShadow: `0 0 12px ${stage.color}50` }}
          />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              DNA da Etapa: {stage.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure como a IA deve se comportar nesta etapa
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            "gap-2 transition-all",
            hasChanges && "animate-pulse"
          )}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* AI Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isActive ? "bg-emerald-500/20" : "bg-muted"
            )}>
              <Sparkles className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-emerald-400" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <Label className="text-base font-medium">Agente de IA Ativo</Label>
              <p className="text-sm text-muted-foreground">
                {isActive 
                  ? "A IA responderá automaticamente nesta etapa" 
                  : "Atendimento manual - a IA não responderá"
                }
              </p>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {!isActive && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              A IA está desativada nesta etapa. As configurações abaixo serão aplicadas quando você ativar o agente.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="grid gap-6">
          {/* Agent Name Override */}
          <div className="space-y-2">
            <Label htmlFor="aiName" className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Nome do Agente (nesta etapa)
            </Label>
            <Input
              id="aiName"
              placeholder={globalConfig?.agent_name || "Nome do agente..."}
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar o nome global: "{globalConfig?.agent_name}"
            </p>
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="aiPersona">Personalidade / Persona</Label>
            <Textarea
              id="aiPersona"
              placeholder="Ex: Você é um consultor de seguros experiente e empático. Sempre demonstre interesse genuíno pelo cliente..."
              value={aiPersona}
              onChange={(e) => setAiPersona(e.target.value)}
              className="min-h-[100px] bg-background/50 resize-none"
            />
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="aiObjective">Objetivo Principal</Label>
            <Textarea
              id="aiObjective"
              placeholder="Ex: Qualificar o lead identificando: tipo de seguro desejado, orçamento disponível e urgência. Ao final, agendar uma ligação."
              value={aiObjective}
              onChange={(e) => setAiObjective(e.target.value)}
              className="min-h-[100px] bg-background/50 resize-none"
            />
          </div>

          {/* Custom Rules */}
          <div className="space-y-2">
            <Label htmlFor="aiCustomRules">Regras Específicas</Label>
            <Textarea
              id="aiCustomRules"
              placeholder="Ex: Nunca mencione preços antes de coletar todas as informações. Se o cliente perguntar sobre sinistros, transfira para atendimento humano."
              value={aiCustomRules}
              onChange={(e) => setAiCustomRules(e.target.value)}
              className="min-h-[120px] bg-background/50 resize-none"
            />
          </div>

          {/* Max Messages */}
          <div className="space-y-2">
            <Label htmlFor="maxMessages">Máximo de Mensagens antes de Transferir</Label>
            <div className="flex items-center gap-4">
              <Input
                id="maxMessages"
                type="number"
                min={1}
                max={50}
                value={maxMessages}
                onChange={(e) => setMaxMessages(parseInt(e.target.value) || 10)}
                className="w-24 bg-background/50"
              />
              <span className="text-sm text-muted-foreground">
                mensagens antes de escalar para humano
              </span>
            </div>
          </div>
        </div>

        {/* Global Config Info */}
        {globalConfig?.base_instructions && (
          <Alert className="bg-muted/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Instruções Base Globais:</strong> "{globalConfig.base_instructions.substring(0, 100)}..."
              <br />
              <span className="text-xs">Estas instruções são aplicadas em todas as etapas.</span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
