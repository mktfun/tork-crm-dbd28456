import React from 'react';
import { Plus, Settings, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StageFlowCard } from './StageFlowCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  chatwoot_label?: string | null;
}

interface AiSetting {
  id?: string;
  stage_id: string;
  ai_name?: string | null;
  ai_persona?: string | null;
  ai_objective?: string | null;
  ai_custom_rules?: string | null;
  is_active?: boolean | null;
  max_messages_before_human?: number | null;
}

interface PipelineDefault {
  ai_persona?: string | null;
  ai_objective?: string | null;
  is_active?: boolean | null;
}

interface SalesFlowTimelineProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onSelectPipeline: (id: string) => void;
  stages: Stage[];
  aiSettings: AiSetting[];
  pipelineDefault: PipelineDefault | null;
  selectedStageId: string | null;
  stageConfigMap: Map<string, boolean>;
  onSelectStage: (id: string) => void;
  onToggleAI: (stageId: string, isActive: boolean) => void;
  onSaveStageConfig: (data: Partial<AiSetting>) => void;
  onResetStageToDefault: (stageId: string) => void;
  onOpenPipelineDefaults: () => void;
  onEditPipeline: () => void;
  onAddStage: () => void;
  onAddPipeline: () => void;
  isSaving?: boolean;
}

export function SalesFlowTimeline({
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  stages,
  aiSettings,
  pipelineDefault,
  selectedStageId,
  stageConfigMap,
  onSelectStage,
  onToggleAI,
  onSaveStageConfig,
  onResetStageToDefault,
  onOpenPipelineDefaults,
  onEditPipeline,
  onAddStage,
  onAddPipeline,
  isSaving,
}: SalesFlowTimelineProps) {
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  
  const aiSettingsMap = new Map(aiSettings.map(s => [s.stage_id, s]));
  
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  
  // Count active AI stages
  const activeCount = stages.filter(s => {
    const setting = aiSettingsMap.get(s.id);
    return setting?.is_active ?? pipelineDefault?.is_active ?? false;
  }).length;

  return (
    <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Fluxo de Vendas</h2>
            <p className="text-xs text-muted-foreground">
              {stages.length} etapas • {activeCount} com IA ativa
            </p>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onAddPipeline}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Funil
          </Button>
        </div>
        
        {/* Pipeline selector */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedPipelineId || undefined}
            onValueChange={onSelectPipeline}
          >
            <SelectTrigger className="flex-1 bg-secondary/50 border-border/50 h-9">
              <SelectValue placeholder="Selecione um funil" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.is_default && " ★"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={onOpenPipelineDefaults}
                  disabled={!selectedPipeline}
                >
                  <Dna className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                DNA Padrão do Funil
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={onEditPipeline}
                  disabled={!selectedPipeline}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Configurar Funil
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Stages timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {sortedStages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Nenhuma etapa criada
              </h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                Crie etapas para configurar a IA em cada fase do funil
              </p>
              <Button size="sm" onClick={onAddStage}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Criar Primeira Etapa
              </Button>
            </div>
          ) : (
            <>
              {sortedStages.map((stage, index) => (
                <StageFlowCard
                  key={stage.id}
                  stage={stage}
                  aiSetting={aiSettingsMap.get(stage.id) || null}
                  pipelineDefault={pipelineDefault}
                  isSelected={selectedStageId === stage.id}
                  hasCustomConfig={stageConfigMap.get(stage.id) ?? false}
                  onSelect={() => onSelectStage(stage.id)}
                  onToggleAI={onToggleAI}
                  onSaveConfig={onSaveStageConfig}
                  onResetToDefault={onResetStageToDefault}
                  isSaving={isSaving}
                />
              ))}
              
              {/* Add stage button */}
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={onAddStage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Etapa
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
