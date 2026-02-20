
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { useCRMPipelines } from '@/hooks/useCRMPipelines';
import { useCRMStages } from '@/hooks/useCRMDeals';
import { useCrmAiSettings } from '@/hooks/useCrmAiSettings';
import { useGlobalAiConfig } from '@/hooks/useGlobalAiConfig';
import { usePipelineAiDefaults } from '@/hooks/usePipelineAiDefaults';
import { SalesFlowTimeline } from './SalesFlowTimeline';
import { AISandbox } from './AISandbox';
import { SandboxFloatingCard } from './SandboxFloatingCard';
import { PipelineAiDefaultsModal } from './PipelineAiDefaultsModal';
import { NewPipelineModal } from '@/components/crm/NewPipelineModal';
import { NewStageModal } from '@/components/crm/NewStageModal';
import { StageEditModal } from '@/components/crm/StageEditModal';
import { PipelineEditModal } from '@/components/crm/PipelineEditModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationConfigTab } from './AutomationConfigTab';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function AIAutomationDashboard() {
  const { pipelines, isLoading: pipelinesLoading } = useCRMPipelines();
  const { config: globalConfig } = useGlobalAiConfig();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pipeline selection
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];

  // Get stages for selected pipeline
  const { stages, isLoading: stagesLoading } = useCRMStages(selectedPipeline?.id);

  // Get AI settings for selected pipeline
  const { aiSettings, upsertSetting, isLoading: aiSettingsLoading } = useCrmAiSettings(selectedPipeline?.id);

  // Get pipeline AI defaults
  const { pipelineDefault, resetStageToDefault, isLoading: pipelineDefaultLoading } = usePipelineAiDefaults(selectedPipeline?.id || null);

  // Selected stage for editing
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStage = stages.find(s => s.id === selectedStageId) || null;
  const sortedStagesForNext = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages]
  );
  const nextStage = selectedStage
    ? sortedStagesForNext.find(s => s.position > selectedStage.position) ?? null
    : null;
  const selectedAiSetting = aiSettings.find(s => s.stage_id === selectedStageId) || null;

  // Modals
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
  const [showPipelineDefaults, setShowPipelineDefaults] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<any>(null);

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

  const handleToggleAI = async (stageId: string, isActive: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        stage_id: stageId,
        is_active: isActive,
      });
      toast.success(isActive ? 'IA ativada!' : 'IA desativada');
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast.error('Erro ao alterar status da IA');
    }
  };

  const handleSaveStageConfig = async (data: any) => {
    try {
      await upsertSetting.mutateAsync(data);
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleResetStageToDefault = async (stageId: string) => {
    try {
      await resetStageToDefault.mutateAsync(stageId);
      toast.success('Configuração resetada para o padrão');
    } catch (error) {
      console.error('Error resetting stage:', error);
      toast.error('Erro ao resetar configuração');
    }
  };

  // Build stage config map for badges
  const stageConfigMap = new Map<string, boolean>();
  aiSettings.forEach(setting => {
    stageConfigMap.set(setting.stage_id, !!setting.id);
  });

  const isLoading = pipelinesLoading || stagesLoading || aiSettingsLoading || pipelineDefaultLoading;

  if (isLoading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Nenhum Funil Configurado
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Crie seu primeiro funil de vendas para começar a configurar a automação de IA.
        </p>
        <NewPipelineModal open={showNewPipeline} onOpenChange={setShowNewPipeline} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tabs */}
      <Tabs defaultValue="etapas" className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-border px-6 flex-shrink-0">
          <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0">
            <TabsTrigger
              value="etapas"
              className="px-0 pb-3 pt-2 mr-6 h-auto rounded-none border-b-2 border-transparent
                         text-sm font-medium text-muted-foreground bg-transparent shadow-none
                         data-[state=active]:border-primary data-[state=active]:text-foreground
                         data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Configurar Etapas
            </TabsTrigger>
            <TabsTrigger
              value="configuracoes"
              className="px-0 pb-3 pt-2 h-auto rounded-none border-b-2 border-transparent
                         text-sm font-medium text-muted-foreground bg-transparent shadow-none
                         data-[state=active]:border-primary data-[state=active]:text-foreground
                         data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Configurações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="etapas" className="flex-1 m-0 overflow-y-auto scroll-smooth relative" ref={scrollContainerRef as any}>
          <div className="grid grid-cols-1 lg:grid-cols-5 items-start">
            {/* Left column — flows naturally, scrolls with the page */}
            <div className="lg:col-span-3 p-4">
              <SalesFlowTimeline
                pipelines={pipelines}
                selectedPipelineId={selectedPipelineId}
                onSelectPipeline={setSelectedPipelineId}
                stages={stages}
                aiSettings={aiSettings}
                pipelineDefault={pipelineDefault}
                selectedStageId={selectedStageId}
                stageConfigMap={stageConfigMap}
                onSelectStage={setSelectedStageId}
                onToggleAI={handleToggleAI}
                onSaveStageConfig={handleSaveStageConfig}
                onResetStageToDefault={handleResetStageToDefault}
                onOpenPipelineDefaults={() => setShowPipelineDefaults(true)}
                onEditPipeline={() => setEditingPipeline(selectedPipeline)}
                onAddStage={() => setShowNewStage(true)}
                onAddPipeline={() => setShowNewPipeline(true)}
                isSaving={upsertSetting.isPending}
              />
            </div>

            {/* Right column — floating card pinned to viewport */}
            <SandboxFloatingCard scrollContainerRef={scrollContainerRef}>
              <AISandbox
                selectedStage={selectedStage}
                selectedPipeline={selectedPipeline}
                aiSetting={selectedAiSetting}
                pipelineDefault={pipelineDefault}
                nextStageName={nextStage?.name}
                companyName={globalConfig?.company_name ?? undefined}
                globalBaseInstructions={globalConfig?.base_instructions ?? undefined}
                globalAgentName={globalConfig?.agent_name ?? undefined}
              />
            </SandboxFloatingCard>
          </div>
        </TabsContent>

        <TabsContent value="configuracoes" className="flex-1 m-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            <AutomationConfigTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewPipelineModal open={showNewPipeline} onOpenChange={setShowNewPipeline} />
      <NewStageModal open={showNewStage} onOpenChange={setShowNewStage} pipelineId={selectedPipeline?.id} />

      {selectedPipeline && (
        <PipelineAiDefaultsModal
          open={showPipelineDefaults}
          onOpenChange={setShowPipelineDefaults}
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
        />
      )}

      {editingPipeline && (
        <PipelineEditModal
          open={!!editingPipeline}
          onOpenChange={(open) => !open && setEditingPipeline(null)}
          pipeline={editingPipeline}
        />
      )}
    </div>
  );
}
