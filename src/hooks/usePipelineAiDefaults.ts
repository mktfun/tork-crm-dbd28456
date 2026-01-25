import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PipelineAiDefault {
  id: string;
  user_id: string;
  pipeline_id: string;
  ai_name: string | null;
  ai_persona: string | null;
  ai_objective: string | null;
  ai_custom_rules: string | null;
  voice_id: string | null;
  max_messages_before_human: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertPipelineAiDefaultParams {
  pipeline_id: string;
  ai_name?: string | null;
  ai_persona?: string | null;
  ai_objective?: string | null;
  ai_custom_rules?: string | null;
  voice_id?: string | null;
  max_messages_before_human?: number;
  is_active?: boolean;
}

export function usePipelineAiDefaults(pipelineId: string | null) {
  const queryClient = useQueryClient();

  // Fetch pipeline AI defaults
  const { data: pipelineDefault, isLoading, error } = useQuery({
    queryKey: ['pipeline-ai-defaults', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;

      const { data, error } = await supabase
        .from('crm_pipeline_ai_defaults')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error) throw error;
      return data as PipelineAiDefault | null;
    },
    enabled: !!pipelineId,
  });

  // Upsert pipeline AI defaults
  const upsertDefault = useMutation({
    mutationFn: async (params: UpsertPipelineAiDefaultParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Check if already exists
      const { data: existing } = await supabase
        .from('crm_pipeline_ai_defaults')
        .select('id')
        .eq('pipeline_id', params.pipeline_id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('crm_pipeline_ai_defaults')
          .update({
            ai_name: params.ai_name,
            ai_persona: params.ai_persona,
            ai_objective: params.ai_objective,
            ai_custom_rules: params.ai_custom_rules,
            voice_id: params.voice_id,
            max_messages_before_human: params.max_messages_before_human,
            is_active: params.is_active,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('crm_pipeline_ai_defaults')
          .insert({
            user_id: user.id,
            pipeline_id: params.pipeline_id,
            ai_name: params.ai_name || 'Assistente Tork',
            ai_persona: params.ai_persona,
            ai_objective: params.ai_objective,
            ai_custom_rules: params.ai_custom_rules,
            voice_id: params.voice_id,
            max_messages_before_human: params.max_messages_before_human || 10,
            is_active: params.is_active ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-ai-defaults', pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['crm-ai-settings', pipelineId] });
      toast.success('DNA padrão do funil salvo!');
    },
    onError: (error) => {
      console.error('Erro ao salvar DNA do pipeline:', error);
      toast.error('Erro ao salvar configuração padrão');
    },
  });

  // Apply defaults to all stages (mass upsert)
  const applyToAllStages = useMutation({
    mutationFn: async (params: { pipelineId: string; overwriteExisting: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get the pipeline default
      const { data: defaultConfig } = await supabase
        .from('crm_pipeline_ai_defaults')
        .select('*')
        .eq('pipeline_id', params.pipelineId)
        .single();

      if (!defaultConfig) throw new Error('Configure o DNA padrão do funil primeiro');

      // Get all stages for this pipeline
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', params.pipelineId);

      if (!stages || stages.length === 0) return { updated: 0 };

      let updatedCount = 0;

      for (const stage of stages) {
        // Check if stage already has custom config
        const { data: existing } = await supabase
          .from('crm_ai_settings')
          .select('id')
          .eq('stage_id', stage.id)
          .maybeSingle();

        if (existing && !params.overwriteExisting) {
          continue; // Skip existing configs
        }

        if (existing) {
          // Update existing
          await supabase
            .from('crm_ai_settings')
            .update({
              ai_name: defaultConfig.ai_name,
              ai_persona: defaultConfig.ai_persona,
              ai_objective: defaultConfig.ai_objective,
              ai_custom_rules: defaultConfig.ai_custom_rules,
              voice_id: defaultConfig.voice_id,
              max_messages_before_human: defaultConfig.max_messages_before_human,
              is_active: defaultConfig.is_active,
            })
            .eq('id', existing.id);
        } else {
          // Insert new
          await supabase
            .from('crm_ai_settings')
            .insert({
              user_id: user.id,
              stage_id: stage.id,
              ai_name: defaultConfig.ai_name,
              ai_persona: defaultConfig.ai_persona,
              ai_objective: defaultConfig.ai_objective,
              ai_custom_rules: defaultConfig.ai_custom_rules,
              voice_id: defaultConfig.voice_id,
              max_messages_before_human: defaultConfig.max_messages_before_human,
              is_active: defaultConfig.is_active,
            });
        }
        updatedCount++;
      }

      return { updated: updatedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-ai-settings', pipelineId] });
      toast.success(`DNA aplicado em ${result.updated} etapas!`);
    },
    onError: (error) => {
      console.error('Erro ao aplicar DNA:', error);
      toast.error('Erro ao aplicar DNA em todas as etapas');
    },
  });

  // Delete stage-specific config (reset to pipeline default)
  const resetStageToDefault = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('crm_ai_settings')
        .delete()
        .eq('stage_id', stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-ai-settings', pipelineId] });
      toast.success('Etapa resetada para o padrão do funil');
    },
    onError: (error) => {
      console.error('Erro ao resetar etapa:', error);
      toast.error('Erro ao resetar configuração');
    },
  });

  return {
    pipelineDefault,
    isLoading,
    error,
    upsertDefault,
    applyToAllStages,
    resetStageToDefault,
  };
}
