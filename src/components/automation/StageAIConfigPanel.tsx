import React, { useState, useEffect } from 'react';
import { Bot, Save, Sparkles, Info, AlertCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import { AI_PERSONA_PRESETS, AIPreset } from './aiPresets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const applyPreset = (preset: AIPreset) => {
    setAiPersona(preset.persona);
    setAiObjective(preset.objective);
    setAiCustomRules(preset.rules);
    setHasChanges(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-zinc-900"
            style={{ backgroundColor: stage.color }}
          />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {stage.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configuração do agente para esta etapa
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* AI Toggle Card */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isActive ? "bg-emerald-500/20" : "bg-zinc-800"
              )}>
                <Sparkles className={cn(
                  "h-4 w-4",
                  isActive ? "text-emerald-400" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <Label className="font-medium">Agente de IA</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Ativo" : "Manual"}
                </p>
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </GlassCard>

        {!isActive && (
          <Alert className="bg-zinc-900/50 border-zinc-800">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              IA desativada. Configure para uso futuro.
            </AlertDescription>
          </Alert>
        )}

        {/* Preset Selector */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Aplicar Preset
            </Label>
          </div>
          <Select onValueChange={(id) => {
            const preset = AI_PERSONA_PRESETS.find(p => p.id === id);
            if (preset) applyPreset(preset);
          }}>
            <SelectTrigger className="bg-zinc-900/50 border-zinc-800">
              <SelectValue placeholder="Selecione um modelo de persona..." />
            </SelectTrigger>
            <SelectContent>
              {AI_PERSONA_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <span className="flex items-center gap-2">
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                    <span className="text-xs text-muted-foreground">— {preset.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Presets preenchem os campos abaixo. Você pode editá-los depois.
          </p>
        </GlassCard>

        {/* Form Fields */}
        <GlassCard className="p-4 space-y-4">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="aiName" className="text-sm flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Nome do Agente
            </Label>
            <Input
              id="aiName"
              placeholder={globalConfig?.agent_name || "Nome..."}
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800"
            />
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="aiPersona" className="text-sm">Personalidade</Label>
            <Textarea
              id="aiPersona"
              placeholder="Descreva como o agente deve se comportar..."
              value={aiPersona}
              onChange={(e) => setAiPersona(e.target.value)}
              className="min-h-[80px] bg-zinc-900/50 border-zinc-800 resize-none text-sm"
            />
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="aiObjective" className="text-sm">Objetivo</Label>
            <Textarea
              id="aiObjective"
              placeholder="O que o agente deve alcançar nesta etapa..."
              value={aiObjective}
              onChange={(e) => setAiObjective(e.target.value)}
              className="min-h-[80px] bg-zinc-900/50 border-zinc-800 resize-none text-sm"
            />
          </div>

          {/* Custom Rules */}
          <div className="space-y-2">
            <Label htmlFor="aiCustomRules" className="text-sm">Regras Específicas</Label>
            <Textarea
              id="aiCustomRules"
              placeholder="Regras e restrições para esta etapa..."
              value={aiCustomRules}
              onChange={(e) => setAiCustomRules(e.target.value)}
              className="min-h-[100px] bg-zinc-900/50 border-zinc-800 resize-none text-sm"
            />
          </div>

          {/* Max Messages */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Label htmlFor="maxMessages" className="text-sm">
              Limite de mensagens antes de escalar
            </Label>
            <Input
              id="maxMessages"
              type="number"
              min={1}
              max={50}
              value={maxMessages}
              onChange={(e) => setMaxMessages(parseInt(e.target.value) || 10)}
              className="w-20 bg-zinc-900/50 border-zinc-800 text-center"
            />
          </div>
        </GlassCard>

        {/* Global Config Reference */}
        {globalConfig?.base_instructions && (
          <GlassCard className="p-3 bg-zinc-900/30">
            <p className="text-xs text-muted-foreground">
              <strong>Base Global:</strong> {globalConfig.base_instructions.substring(0, 80)}...
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
