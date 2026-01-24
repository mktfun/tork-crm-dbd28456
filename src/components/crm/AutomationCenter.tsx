import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Save, ChevronDown, Zap, MessageSquare, Target, Shield } from 'lucide-react';
import { useCrmAiSettings, CrmAiSettingWithStage, UpsertAiSettingParams } from '@/hooks/useCrmAiSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';

interface AutomationCenterProps {
  pipelineId: string | null;
}

interface StageFormState {
  ai_name: string;
  ai_persona: string;
  ai_objective: string;
  ai_custom_rules: string;
  max_messages_before_human: number;
  is_active: boolean;
}

function StageAiForm({ 
  setting, 
  onSave, 
  onToggle,
  isSaving 
}: { 
  setting: CrmAiSettingWithStage;
  onSave: (params: UpsertAiSettingParams) => void;
  onToggle: (stageId: string, isActive: boolean) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<StageFormState>({
    ai_name: setting.ai_name,
    ai_persona: setting.ai_persona,
    ai_objective: setting.ai_objective,
    ai_custom_rules: setting.ai_custom_rules,
    max_messages_before_human: setting.max_messages_before_human,
    is_active: setting.is_active,
  });

  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (field: keyof StageFormState, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave({
      stage_id: setting.stage_id,
      ...form,
    });
    setIsDirty(false);
  };

  const handleToggle = (checked: boolean) => {
    handleChange('is_active', checked);
    onToggle(setting.stage_id, checked);
  };

  return (
    <div className="space-y-4 p-4 bg-background/50 rounded-lg border border-border/50">
      {/* Header com toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: setting.stage_color }}
          />
          <span className="font-medium text-foreground">{setting.stage_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${setting.stage_id}`} className="text-sm text-muted-foreground">
            IA Ativa
          </Label>
          <Switch
            id={`toggle-${setting.stage_id}`}
            checked={form.is_active}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {/* Formulário */}
      <div className="grid gap-4">
        {/* Nome do Agente */}
        <div className="space-y-2">
          <Label htmlFor={`name-${setting.stage_id}`} className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" />
            Nome do Agente
          </Label>
          <Input
            id={`name-${setting.stage_id}`}
            value={form.ai_name}
            onChange={(e) => handleChange('ai_name', e.target.value)}
            placeholder="Ex: Assistente Tork"
            className="bg-background"
          />
        </div>

        {/* Personalidade */}
        <div className="space-y-2">
          <Label htmlFor={`persona-${setting.stage_id}`} className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Personalidade
          </Label>
          <Textarea
            id={`persona-${setting.stage_id}`}
            value={form.ai_persona}
            onChange={(e) => handleChange('ai_persona', e.target.value)}
            placeholder="Descreva a personalidade e tom de voz do agente..."
            className="bg-background min-h-[80px] resize-none"
          />
        </div>

        {/* Objetivo */}
        <div className="space-y-2">
          <Label htmlFor={`objective-${setting.stage_id}`} className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-green-500" />
            Objetivo desta Etapa
          </Label>
          <Textarea
            id={`objective-${setting.stage_id}`}
            value={form.ai_objective}
            onChange={(e) => handleChange('ai_objective', e.target.value)}
            placeholder="Qual é o objetivo do agente nesta etapa do funil?"
            className="bg-background min-h-[80px] resize-none"
          />
        </div>

        {/* Regras Customizadas */}
        <div className="space-y-2">
          <Label htmlFor={`rules-${setting.stage_id}`} className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-red-500" />
            Regras Customizadas
          </Label>
          <Textarea
            id={`rules-${setting.stage_id}`}
            value={form.ai_custom_rules}
            onChange={(e) => handleChange('ai_custom_rules', e.target.value)}
            placeholder="Regras específicas: o que o agente NÃO deve fazer, dados obrigatórios..."
            className="bg-background min-h-[80px] resize-none"
          />
        </div>

        {/* Limite de mensagens */}
        <div className="space-y-2">
          <Label htmlFor={`max-${setting.stage_id}`} className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Máx. mensagens antes de escalar para humano
          </Label>
          <Input
            id={`max-${setting.stage_id}`}
            type="number"
            min={1}
            max={100}
            value={form.max_messages_before_human}
            onChange={(e) => handleChange('max_messages_before_human', parseInt(e.target.value) || 10)}
            className="bg-background w-32"
          />
        </div>
      </div>

      {/* Botão Salvar */}
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end pt-2"
        >
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export function AutomationCenter({ pipelineId }: AutomationCenterProps) {
  const { aiSettings, isLoading, upsertSetting, toggleActive } = useCrmAiSettings(pipelineId);

  if (!pipelineId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          Selecione um pipeline para configurar a automação de IA.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border/50">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (aiSettings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma etapa configurada
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Crie etapas no seu funil de vendas para configurar o comportamento da IA em cada fase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Centro de Automação de IA</h2>
          <p className="text-sm text-muted-foreground">
            Configure o comportamento do agente para cada etapa do funil
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Como funciona?</p>
            <p className="text-muted-foreground">
              Cada etapa do funil pode ter uma configuração única de IA. Quando um lead entra em uma etapa, 
              o agente assume a personalidade e objetivos definidos aqui. Use o n8n para conectar via{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-xs">v_n8n_agent_config</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Accordion com etapas */}
      <Accordion type="single" collapsible className="space-y-2">
        {aiSettings.map((setting, index) => (
          <AccordionItem 
            key={setting.stage_id} 
            value={setting.stage_id}
            className="border border-border/50 rounded-lg overflow-hidden bg-card/50"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center gap-3 w-full">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: setting.stage_color }}
                />
                <span className="font-medium text-foreground flex-1 text-left">
                  {setting.stage_name}
                </span>
                <div className="flex items-center gap-2 mr-2">
                  {setting.is_active ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                      IA Ativa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      Desativada
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pt-0 pb-0">
              <StageAiForm
                setting={setting}
                onSave={(params) => upsertSetting.mutate(params)}
                onToggle={(stageId, isActive) => toggleActive.mutate({ stageId, isActive })}
                isSaving={upsertSetting.isPending}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
