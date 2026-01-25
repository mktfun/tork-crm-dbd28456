import React, { useState, useEffect } from 'react';
import { Bot, Save, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { usePipelineAiDefaults } from '@/hooks/usePipelineAiDefaults';
import { AI_PERSONA_PRESETS, AIPreset, DYNAMIC_VARIABLES } from './aiPresets';
import { cn } from '@/lib/utils';

interface PipelineAiDefaultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  pipelineName: string;
}

export function PipelineAiDefaultsModal({
  open,
  onOpenChange,
  pipelineId,
  pipelineName,
}: PipelineAiDefaultsModalProps) {
  const { pipelineDefault, isLoading, upsertDefault, applyToAllStages } = usePipelineAiDefaults(pipelineId);

  const [aiName, setAiName] = useState('');
  const [xmlPrompt, setXmlPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxMessages, setMaxMessages] = useState(10);
  const [hasChanges, setHasChanges] = useState(false);

  // Apply to all dialog state
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Reset form when modal opens or data changes
  useEffect(() => {
    if (pipelineDefault) {
      setAiName(pipelineDefault.ai_name || '');
      setXmlPrompt(pipelineDefault.ai_persona || '');
      setIsActive(pipelineDefault.is_active ?? true);
      setMaxMessages(pipelineDefault.max_messages_before_human ?? 10);
    } else {
      setAiName('Assistente Tork');
      setXmlPrompt('');
      setIsActive(true);
      setMaxMessages(10);
    }
    setHasChanges(false);
  }, [pipelineDefault, open]);

  // Track changes
  useEffect(() => {
    const originalName = pipelineDefault?.ai_name || 'Assistente Tork';
    const originalPrompt = pipelineDefault?.ai_persona || '';
    const originalActive = pipelineDefault?.is_active ?? true;
    const originalMaxMessages = pipelineDefault?.max_messages_before_human ?? 10;

    const changed = 
      aiName !== originalName ||
      xmlPrompt !== originalPrompt ||
      isActive !== originalActive ||
      maxMessages !== originalMaxMessages;

    setHasChanges(changed);
  }, [aiName, xmlPrompt, isActive, maxMessages, pipelineDefault]);

  const handleSave = async () => {
    await upsertDefault.mutateAsync({
      pipeline_id: pipelineId,
      ai_name: aiName.trim() || 'Assistente Tork',
      ai_persona: xmlPrompt.trim() || undefined,
      is_active: isActive,
      max_messages_before_human: maxMessages,
    });
    setHasChanges(false);
  };

  const handleApplyToAll = async () => {
    await applyToAllStages.mutateAsync({
      pipelineId,
      overwriteExisting,
    });
    setShowApplyDialog(false);
    setOverwriteExisting(false);
  };

  const applyPreset = (preset: AIPreset) => {
    setXmlPrompt(preset.xmlPrompt);
    setHasChanges(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <Bot className="h-5 w-5 text-zinc-500" />
              DNA Padrão do Funil
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure o DNA base para o funil "{pipelineName}". Etapas sem configuração própria herdarão estes valores.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* AI Toggle */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive ? "bg-zinc-700" : "bg-zinc-800"
                  )}>
                    <Bot className={cn(
                      "h-4 w-4",
                      isActive ? "text-emerald-400" : "text-zinc-600"
                    )} />
                  </div>
                  <div>
                    <Label className="font-medium text-zinc-100">IA Ativa por Padrão</Label>
                    <p className="text-xs text-zinc-500">
                      Etapas herdarão este status
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

            {/* Preset Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4 text-zinc-500" />
                Aplicar Preset
              </Label>
              <Select onValueChange={(id) => {
                const preset = AI_PERSONA_PRESETS.find(p => p.id === id);
                if (preset) applyPreset(preset);
              }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Selecione um modelo de persona..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {AI_PERSONA_PRESETS.map((preset) => (
                    <SelectItem 
                      key={preset.id} 
                      value={preset.id}
                      className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
                    >
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-xs text-zinc-500">{preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="aiName" className="text-zinc-400 text-sm">
                Nome do Agente Padrão
              </Label>
              <Input
                id="aiName"
                placeholder="Assistente Tork"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* XML Prompt */}
            <div className="space-y-2">
              <Label htmlFor="xmlPrompt" className="text-zinc-400 text-sm">
                Prompt Estruturado (XML)
              </Label>
              <Textarea
                id="xmlPrompt"
                placeholder="<identity>Descreva quem é o agente...</identity>"
                value={xmlPrompt}
                onChange={(e) => setXmlPrompt(e.target.value)}
                className="min-h-[200px] bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none text-sm font-mono"
              />
              <p className="text-xs text-zinc-500">
                Variáveis disponíveis:{' '}
                {DYNAMIC_VARIABLES.map((v, i) => (
                  <span key={v.variable}>
                    <span className="text-emerald-400 font-mono">{v.variable}</span>
                    {i < DYNAMIC_VARIABLES.length - 1 && ', '}
                  </span>
                ))}
                {', '}
                <span className="text-emerald-400 font-mono">{'{{deal_title}}'}</span>
                {', '}
                <span className="text-emerald-400 font-mono">{'{{pipeline_name}}'}</span>
              </p>
            </div>

            {/* Max Messages */}
            <div className="flex items-center justify-between">
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
                className="w-20 bg-zinc-800 border-zinc-700 text-zinc-100 text-center"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setShowApplyDialog(true)}
              disabled={!pipelineDefault}
              className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Copy className="h-4 w-4" />
              Aplicar a Todas Etapas
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || upsertDefault.isPending}
                className="gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
              >
                <Save className="h-4 w-4" />
                {upsertDefault.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply to All Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Aplicar DNA a Todas as Etapas
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Isso irá copiar o DNA padrão do funil para todas as etapas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="overwrite" 
              checked={overwriteExisting}
              onCheckedChange={(checked) => setOverwriteExisting(!!checked)}
              className="border-zinc-600 data-[state=checked]:bg-zinc-600"
            />
            <label
              htmlFor="overwrite"
              className="text-sm font-medium text-zinc-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sobrescrever etapas já customizadas
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApplyToAll}
              disabled={applyToAllStages.isPending}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            >
              {applyToAllStages.isPending ? 'Aplicando...' : 'Aplicar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
