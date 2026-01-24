import React, { useState, useEffect } from 'react';
import { Bot, Plus, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMPipelines } from '@/hooks/useCRMPipelines';
import { useCRMStages } from '@/hooks/useCRMDeals';
import { useCrmAiSettings } from '@/hooks/useCrmAiSettings';
import { useGlobalAiConfig } from '@/hooks/useGlobalAiConfig';
import { PipelineStageSidebar } from './PipelineStageSidebar';
import { StageAIConfigPanel } from './StageAIConfigPanel';
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
  
  // Selected stage for editing
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStage = stages.find(s => s.id === selectedStageId) || null;
  const selectedAiSetting = aiSettings.find(s => s.stage_id === selectedStageId) || null;
  
  // Modals
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
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

  const handleSaveAiConfig = async (data: any) => {
    try {
      await upsertSetting.mutateAsync(data);
      toast.success('Configuração da IA salva!');
    } catch (error) {
      console.error('Error saving AI config:', error);
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

  const isLoading = pipelinesLoading || stagesLoading || aiSettingsLoading;

  if (isLoading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando automação...</p>
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Crie seu Primeiro Funil
          </h2>
          <p className="text-muted-foreground mb-6">
            Para configurar a automação de IA, você precisa ter pelo menos um funil de vendas com etapas definidas.
          </p>
          <Button onClick={() => setShowNewPipeline(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Funil
          </Button>
        </div>
        
        <NewPipelineModal
          open={showNewPipeline}
          onOpenChange={setShowNewPipeline}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Centro de Automação</h1>
            <p className="text-sm text-muted-foreground">Configure o DNA da IA para cada etapa</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Pipeline Selector */}
          <Select
            value={selectedPipelineId || undefined}
            onValueChange={setSelectedPipelineId}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-background/50">
              <SelectValue placeholder="Selecione um funil" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.is_default && " (padrão)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pipeline Actions */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditingPipeline(selectedPipeline)}
            disabled={!selectedPipeline}
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button onClick={() => setShowNewPipeline(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Funil</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Stages List */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border/50 bg-card/30 overflow-hidden">
          <PipelineStageSidebar
            stages={stages}
            aiSettings={aiSettings}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
            onReorderStages={handleReorderStages}
            onEditStage={setEditingStage}
            onDeleteStage={setDeleteStageId}
            onAddStage={() => setShowNewStage(true)}
          />
        </div>

        {/* Main Panel - Stage Config */}
        <div className="flex-1 overflow-hidden bg-background/30">
          <StageAIConfigPanel
            stage={selectedStage}
            aiSetting={selectedAiSetting}
            globalConfig={globalConfig}
            onSave={handleSaveAiConfig}
            isSaving={upsertSetting.isPending}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etapa? Esta ação não pode ser desfeita.
              As configurações de IA associadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStage} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
