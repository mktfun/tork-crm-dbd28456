import React, { useState, useEffect } from 'react';
import { Bot, Save, Info, FileText, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AI_PERSONA_PRESETS, AIPreset, XML_TAGS_REFERENCE, DYNAMIC_VARIABLES } from './aiPresets';
import { ConfigSourceBadge, ConfigSource, determineConfigSource, getConfigSourceDescription } from './ConfigSourceBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PipelineAiDefault } from '@/hooks/usePipelineAiDefaults';

interface StageAIConfigPanelProps {
  stage: {
    id: string;
    name: string;
    color: string;
  } | null;
  aiSetting: {
    id?: string;
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
  pipelineDefault?: PipelineAiDefault | null;
  onSave: (data: {
    stage_id: string;
    ai_name?: string;
    ai_persona?: string;
    ai_objective?: string;
    ai_custom_rules?: string;
    is_active?: boolean;
    max_messages_before_human?: number;
  }) => Promise<void>;
  onResetToDefault?: (stageId: string) => Promise<void>;
  isSaving?: boolean;
  isResetting?: boolean;
}

export function StageAIConfigPanel({
  stage,
  aiSetting,
  globalConfig,
  pipelineDefault,
  onSave,
  onResetToDefault,
  isSaving = false,
  isResetting = false,
}: StageAIConfigPanelProps) {
  const [aiName, setAiName] = useState('');
  const [xmlPrompt, setXmlPrompt] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [maxMessages, setMaxMessages] = useState(10);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Determine if stage has its own config
  const hasStageConfig = !!aiSetting?.id;
  const hasPipelineDefault = !!pipelineDefault?.ai_persona || !!pipelineDefault?.ai_name;
  const hasGlobalConfig = !!globalConfig?.base_instructions;
  
  const configSource = determineConfigSource(hasStageConfig, hasPipelineDefault, hasGlobalConfig);
  const isInherited = configSource !== 'stage';

  // Get effective values based on hierarchy
  const getEffectiveValue = <T,>(
    stageValue: T | undefined,
    pipelineValue: T | undefined | null,
    globalValue: T | undefined,
    defaultValue: T
  ): T => {
    if (stageValue !== undefined && stageValue !== '' && stageValue !== null) return stageValue;
    if (pipelineValue !== undefined && pipelineValue !== '' && pipelineValue !== null) return pipelineValue;
    if (globalValue !== undefined && globalValue !== '' && globalValue !== null) return globalValue;
    return defaultValue;
  };

  // Reset form when stage changes
  useEffect(() => {
    const effectiveName = getEffectiveValue(
      aiSetting?.ai_name,
      pipelineDefault?.ai_name,
      globalConfig?.agent_name,
      'Assistente Tork'
    );
    const effectivePrompt = getEffectiveValue(
      aiSetting?.ai_persona,
      pipelineDefault?.ai_persona,
      globalConfig?.base_instructions,
      ''
    );
    const effectiveActive = getEffectiveValue(
      aiSetting?.is_active,
      pipelineDefault?.is_active,
      undefined,
      false
    );
    const effectiveMaxMessages = getEffectiveValue(
      aiSetting?.max_messages_before_human,
      pipelineDefault?.max_messages_before_human,
      undefined,
      10
    );

    setAiName(effectiveName);
    setXmlPrompt(effectivePrompt);
    setIsActive(effectiveActive);
    setMaxMessages(effectiveMaxMessages);
    setHasChanges(false);
  }, [stage?.id, aiSetting, pipelineDefault, globalConfig]);

  // Track changes
  useEffect(() => {
    if (!stage) return;
    
    const effectiveName = getEffectiveValue(
      aiSetting?.ai_name,
      pipelineDefault?.ai_name,
      globalConfig?.agent_name,
      'Assistente Tork'
    );
    const effectivePrompt = getEffectiveValue(
      aiSetting?.ai_persona,
      pipelineDefault?.ai_persona,
      globalConfig?.base_instructions,
      ''
    );
    const effectiveActive = getEffectiveValue(
      aiSetting?.is_active,
      pipelineDefault?.is_active,
      undefined,
      false
    );
    const effectiveMaxMessages = getEffectiveValue(
      aiSetting?.max_messages_before_human,
      pipelineDefault?.max_messages_before_human,
      undefined,
      10
    );

    const changed = 
      aiName !== effectiveName ||
      xmlPrompt !== effectivePrompt ||
      isActive !== effectiveActive ||
      maxMessages !== effectiveMaxMessages;

    setHasChanges(changed);
  }, [aiName, xmlPrompt, isActive, maxMessages, aiSetting, pipelineDefault, globalConfig, stage]);

  const handleSave = async () => {
    if (!stage) return;
    
    await onSave({
      stage_id: stage.id,
      ai_name: aiName.trim() || undefined,
      ai_persona: xmlPrompt.trim() || undefined,
      is_active: isActive,
      max_messages_before_human: maxMessages,
    });
    setHasChanges(false);
  };

  const handleReset = async () => {
    if (!stage || !onResetToDefault) return;
    await onResetToDefault(stage.id);
    setShowResetDialog(false);
  };

  if (!stage) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950/50 backdrop-blur-md border border-zinc-800 rounded-xl">
        <div className="text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-zinc-500">
            Selecione uma etapa para configurar o DNA da IA
          </p>
        </div>
      </div>
    );
  }

  const applyPreset = (preset: AIPreset) => {
    setXmlPrompt(preset.xmlPrompt);
    setHasChanges(true);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-zinc-950/50 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-zinc-100 truncate">{stage.name}</h3>
                <ConfigSourceBadge source={configSource} size="sm" />
              </div>
              <p className="text-xs text-zinc-500">{getConfigSourceDescription(configSource)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasStageConfig && onResetToDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="gap-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resetar</span>
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
              className={cn(
                "gap-2 text-zinc-100 disabled:opacity-50",
                isInherited && hasChanges 
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-zinc-800 hover:bg-zinc-700"
              )}
            >
              {isInherited && hasChanges ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Customizar
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4 transition-opacity duration-200",
          isInherited && !hasChanges ? "opacity-70" : "opacity-100"
        )}>
          {/* Inherited Alert */}
          {isInherited && !hasChanges && (
            <Alert className="bg-blue-500/5 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 text-sm">
                Edite qualquer campo para customizar esta etapa. Alterações criarão uma configuração específica.
              </AlertDescription>
            </Alert>
          )}

          {/* AI Toggle */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isActive ? "bg-zinc-800" : "bg-zinc-900"
                )}>
                  <Bot className={cn(
                    "h-4 w-4",
                    isActive ? "text-emerald-400" : "text-zinc-600"
                  )} />
                </div>
                <div>
                  <Label className="font-medium text-zinc-100">Agente de IA</Label>
                  <p className="text-xs text-zinc-500">
                    {isActive ? "Ativo nesta etapa" : "Manual"}
                  </p>
                </div>
              </div>
              <Switch 
                checked={isActive} 
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-zinc-600"
              />
            </div>
          </div>

          {!isActive && (
            <Alert className="bg-zinc-900/50 border-zinc-800">
              <Info className="h-4 w-4 text-zinc-500" />
              <AlertDescription className="text-zinc-400 text-sm">
                IA desativada. Configure para uso futuro.
              </AlertDescription>
            </Alert>
          )}

          {/* Preset Selector */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
            <Label className="flex items-center gap-2 text-zinc-400 mb-3">
              <FileText className="h-4 w-4 text-zinc-500" />
              Aplicar Preset
            </Label>
            <Select onValueChange={(id) => {
              const preset = AI_PERSONA_PRESETS.find(p => p.id === id);
              if (preset) applyPreset(preset);
            }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectValue placeholder="Selecione um modelo de persona..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {AI_PERSONA_PRESETS.map((preset) => (
                  <SelectItem 
                    key={preset.id} 
                    value={preset.id}
                    className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                  >
                    <div className="flex flex-col">
                      <span>{preset.name}</span>
                      <span className="text-xs text-zinc-500">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-600 mt-2">
              Presets preenchem o prompt abaixo. Você pode editá-lo depois.
            </p>
          </div>

          {/* Form Fields */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 space-y-4">
            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="aiName" className="text-zinc-400 text-sm flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-zinc-500" />
                Nome do Agente
              </Label>
              <Input
                id="aiName"
                placeholder="Assistente Tork"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* XML Tags Reference */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs font-medium text-zinc-400 mb-2">Referência de Tags XML:</p>
              <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                {XML_TAGS_REFERENCE.map(({ tag, description }) => (
                  <div key={tag} className="flex gap-2">
                    <span className="text-emerald-400">{tag}</span>
                    <span className="text-zinc-500">{description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* XML Structured Prompt */}
            <div className="space-y-2">
              <Label htmlFor="xmlPrompt" className="text-zinc-400 text-sm">
                Prompt Estruturado (XML)
              </Label>
              <Textarea
                id="xmlPrompt"
                placeholder="<identity>Descreva quem é o agente...</identity>

<flow_control>Regras de fluxo...</flow_control>

<business_logic>Regras de negócio...</business_logic>

<output_formatting>Formato de saída...</output_formatting>"
                value={xmlPrompt}
                onChange={(e) => setXmlPrompt(e.target.value)}
                className="min-h-[280px] bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none text-sm font-mono leading-relaxed"
              />
              <p className="text-xs text-zinc-500">
                Variáveis disponíveis:{' '}
                {DYNAMIC_VARIABLES.map((v, i) => (
                  <span key={v.variable}>
                    <span className="text-emerald-400 font-mono">{v.variable}</span>
                    {', '}
                  </span>
                ))}
                <span className="text-emerald-400 font-mono">{'{{deal_title}}'}</span>
                {', '}
                <span className="text-emerald-400 font-mono">{'{{pipeline_name}}'}</span>
              </p>
            </div>

            {/* Max Messages */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <Label htmlFor="maxMessages" className="text-zinc-400 text-sm">
                Limite de mensagens antes de escalar
              </Label>
              <Input
                id="maxMessages"
                type="number"
                min={1}
                max={50}
                value={maxMessages}
                onChange={(e) => setMaxMessages(parseInt(e.target.value) || 10)}
                className="w-20 bg-zinc-900/50 border-zinc-800 text-zinc-100 text-center"
              />
            </div>
          </div>

          {/* Global Config Reference */}
          {globalConfig?.base_instructions && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-zinc-600 uppercase tracking-wide mb-2">
                Instruções Globais (Base)
              </p>
              <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap line-clamp-4 overflow-hidden">
                {globalConfig.base_instructions.substring(0, 200)}...
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Resetar para Padrão</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Isso irá remover a configuração personalizada desta etapa. 
              Ela passará a herdar o DNA do funil ou configuração global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReset}
              disabled={isResetting}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isResetting ? 'Resetando...' : 'Resetar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
