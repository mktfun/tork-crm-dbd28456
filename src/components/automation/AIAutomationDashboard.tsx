import React, { useState, useEffect } from 'react';
import { Bot, Plus, Settings, Loader2, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMPipelines } from '@/hooks/useCRMPipelines';
import { useCRMStages } from '@/hooks/useCRMDeals';
import { useCrmAiSettings } from '@/hooks/useCrmAiSettings';
import { useGlobalAiConfig } from '@/hooks/useGlobalAiConfig';
import { usePipelineAiDefaults } from '@/hooks/usePipelineAiDefaults';
import { PipelineStageSidebar } from './PipelineStageSidebar';
import { StageAIConfigPanel } from './StageAIConfigPanel';
import { PipelineAiDefaultsModal } from './PipelineAiDefaultsModal';
import { NewPipelineModal } from '@/components/crm/NewPipelineModal';
import { NewStageModal } from '@/components/crm/NewStageModal';
import { StageEditModal } from '@/components/crm/StageEditModal';
import { PipelineEditModal } from '@/components/crm/PipelineEditModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AIAutomationDashboard() {
  const { pipelines, isLoading: pipelinesLoading, deletePipeline } = useCRMPipelines();
  const { config: globalConfig } = useGlobalAiConfig();
  
  // Pipeline selection
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];
  
  // Get stages for selected pipeline
  const { stages, reorderStages, deleteStage, isLoading: stagesLoading } = useCRMStages(selectedPipeline?.id);
  
  // Get AI settings for selected pipeline
  const { aiSettings, upsertSetting, isLoading: aiSettingsLoading } = useCrmAiSettings(selectedPipeline?.id);
  
  // Get pipeline AI defaults
  const { pipelineDefault, resetStageToDefault, isLoading: pipelineDefaultLoading } = usePipelineAiDefaults(selectedPipeline?.id || null);
  
  // Selected stage for editing
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStage = stages.find(s => s.id === selectedStageId) || null;
  const selectedAiSetting = aiSettings.find(s => s.stage_id === selectedStageId) || null;
  
  // Modals
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
  const [showPipelineDefaults, setShowPipelineDefaults] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [editingPipeline, setEditingPipeline] = useState<any>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  
  // Auto-select first pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);
  
  // Auto-select first stage when pipeline changes
  useEffect(() => {
    if (stages.length > 0) {
      const sortedStages = [...stages].sort((a, b) => a.position - b.position);
      setSelectedStageId(sortedStages[0]?.id || null);
    } else {
      setSelectedStageId(null);
    }
  }, [stages, selectedPipeline?.id]);

  const handleReorderStages = async (stageIds: string[]) => {
    try {
      await reorderStages.mutateAsync(stageIds);
    } catch (error) {
      console.error('Error reordering stages:', error);
    }
  };

  const handleToggleAI = async (stageId: string, isActive: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        stage_id: stageId,
        is_active: isActive,
      });
    } catch (error) {
      console.error('Error toggling AI:', error);
    }
  };

  const handleSaveAiConfig = async (data: any) => {
    try {
      await upsertSetting.mutateAsync(data);
      toast.success('Configuração da IA salva!');
    } catch (error) {
      console.error('Error saving AI config:', error);
    }
  };

  const handleResetToDefault = async (stageId: string) => {
    try {
      await resetStageToDefault.mutateAsync(stageId);
    } catch (error) {
      console.error('Error resetting stage:', error);
    }
  };

  const handleDeleteStage = async () => {
    if (!deleteStageId) return;
    try {
      await deleteStage.mutateAsync(deleteStageId);
      setDeleteStageId(null);
      toast.success('Etapa excluída!');
    } catch (error) {
      console.error('Error deleting stage:', error);
    }
  };

  // Build stage config map for sidebar badges
  const stageConfigMap = new Map<string, boolean>();
  aiSettings.forEach(setting => {
    // A stage has custom config if it has an ID (was saved to DB)
    stageConfigMap.set(setting.stage_id, !!setting.id);
  });

  const isLoading = pipelinesLoading || stagesLoading || aiSettingsLoading || pipelineDefaultLoading;

  if (isLoading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Bot className="h-8 w-8 text-zinc-600" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          Nenhum Funil Configurado
        </h2>
        <p className="text-zinc-500 mb-6 max-w-md">
          Crie seu primeiro funil de vendas para começar a configurar a automação de IA.
        </p>
        <Button 
          onClick={() => setShowNewPipeline(true)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeiro Funil
        </Button>
        <NewPipelineModal open={showNewPipeline} onOpenChange={setShowNewPipeline} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Bot className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Centro de Automação</h1>
            <p className="text-xs text-zinc-500">Configure o DNA da IA por etapa do funil</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedPipelineId || undefined}
            onValueChange={setSelectedPipelineId}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900 border-zinc-800 text-zinc-100 h-9">
              <SelectValue placeholder="Funil" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {pipelines.map((pipeline) => (
                <SelectItem 
                  key={pipeline.id} 
                  value={pipeline.id}
                  className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                >
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
                  size="sm"
                  className="h-9 gap-1.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => setShowPipelineDefaults(true)}
                  disabled={!selectedPipeline}
                >
                  <Dna className="h-4 w-4" />
                  <span className="hidden sm:inline">DNA Padrão</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                Configurar DNA padrão do funil
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
            onClick={() => setEditingPipeline(selectedPipeline)}
            disabled={!selectedPipeline}
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button 
            onClick={() => setShowNewPipeline(true)} 
            size="sm" 
            className="h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
          >
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Funil</span>
          </Button>
        </div>
      </div>

      {/* Main Content - Two columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0 overflow-hidden">
        {/* Sidebar - Stage List */}
        <div className="lg:col-span-1 min-h-0 overflow-hidden">
          <PipelineStageSidebar
            stages={stages}
            aiSettings={aiSettings}
            stageConfigMap={stageConfigMap}
            hasPipelineDefault={!!pipelineDefault}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
            onReorderStages={handleReorderStages}
            onEditStage={setEditingStage}
            onDeleteStage={setDeleteStageId}
            onAddStage={() => setShowNewStage(true)}
            onToggleAI={handleToggleAI}
          />
        </div>

        {/* Config Panel */}
        <div className="lg:col-span-2 min-h-0 overflow-hidden">
          <StageAIConfigPanel
            stage={selectedStage}
            aiSetting={selectedAiSetting}
            globalConfig={globalConfig}
            pipelineDefault={pipelineDefault}
            onSave={handleSaveAiConfig}
            onResetToDefault={handleResetToDefault}
            isSaving={upsertSetting.isPending}
            isResetting={resetStageToDefault.isPending}
          />
        </div>
      </div>

      {/* Modals */}
      <NewPipelineModal
        open={showNewPipeline}
        onOpenChange={setShowNewPipeline}
      />

      <NewStageModal
        open={showNewStage}
        onOpenChange={setShowNewStage}
        pipelineId={selectedPipeline?.id}
      />

      {selectedPipeline && (
        <PipelineAiDefaultsModal
          open={showPipelineDefaults}
          onOpenChange={setShowPipelineDefaults}
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
        />
      )}

      {editingStage && (
        <StageEditModal
          open={!!editingStage}
          onOpenChange={(open) => !open && setEditingStage(null)}
          stage={editingStage}
        />
      )}

      {editingPipeline && (
        <PipelineEditModal
          open={!!editingPipeline}
          onOpenChange={(open) => !open && setEditingPipeline(null)}
          pipeline={editingPipeline}
        />
      )}

      {/* Delete Stage Confirmation */}
      <AlertDialog open={!!deleteStageId} onOpenChange={(open) => !open && setDeleteStageId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Excluir Etapa</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir esta etapa? As configurações de IA associadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStage} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
