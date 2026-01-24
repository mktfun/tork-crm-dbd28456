import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CrmAiSetting {
  id: string;
  user_id: string;
  stage_id: string;
  ai_name: string;
  ai_persona: string;
  ai_objective: string;
  ai_custom_rules: string;
  voice_id: string | null;
  max_messages_before_human: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmAiSettingWithStage extends CrmAiSetting {
  stage_name: string;
  stage_color: string;
  stage_position: number;
}

export interface UpsertAiSettingParams {
  stage_id: string;
  ai_name?: string;
  ai_persona?: string;
  ai_objective?: string;
  ai_custom_rules?: string;
  voice_id?: string | null;
  max_messages_before_human?: number;
  is_active?: boolean;
}

export function useCrmAiSettings(pipelineId: string | null) {
  const queryClient = useQueryClient();

  // Buscar todas as configs de IA para stages de um pipeline específico
  const { data: aiSettings, isLoading, error } = useQuery({
    queryKey: ['crm-ai-settings', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];

      // Primeiro buscar os stages do pipeline
      const { data: stages, error: stagesError } = await supabase
        .from('crm_stages')
        .select('id, name, color, position')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (stagesError) throw stagesError;
      if (!stages || stages.length === 0) return [];

      // Buscar as configs de IA para esses stages
      const stageIds = stages.map(s => s.id);
      const { data: settings, error: settingsError } = await supabase
        .from('crm_ai_settings')
        .select('*')
        .in('stage_id', stageIds);

      if (settingsError) throw settingsError;

      // Mapear stages com suas configs (ou valores default)
      const settingsWithStages: CrmAiSettingWithStage[] = stages.map(stage => {
        const setting = settings?.find(s => s.stage_id === stage.id);
        
        return {
          id: setting?.id || '',
          user_id: setting?.user_id || '',
          stage_id: stage.id,
          ai_name: setting?.ai_name || 'Assistente Tork',
          ai_persona: setting?.ai_persona || 'Consultor profissional, educado e prestativo. Especialista em seguros.',
          ai_objective: setting?.ai_objective || 'Qualificar o interesse do cliente e coletar dados básicos para cotação.',
          ai_custom_rules: setting?.ai_custom_rules || 'Não prometa valores exatos sem aprovação. Sempre peça CPF para análise.',
          voice_id: setting?.voice_id || null,
          max_messages_before_human: setting?.max_messages_before_human || 10,
          is_active: setting?.is_active ?? true,
          created_at: setting?.created_at || '',
          updated_at: setting?.updated_at || '',
          stage_name: stage.name,
          stage_color: stage.color,
          stage_position: stage.position,
        };
      });

      return settingsWithStages.sort((a, b) => a.stage_position - b.stage_position);
    },
    enabled: !!pipelineId,
  });

  // Upsert (criar ou atualizar) config de IA
  const upsertSetting = useMutation({
    mutationFn: async (params: UpsertAiSettingParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já existe config para este stage
      const { data: existing } = await supabase
        .from('crm_ai_settings')
        .select('id')
        .eq('stage_id', params.stage_id)
        .single();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('crm_ai_settings')
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
          .from('crm_ai_settings')
          .insert({
            user_id: user.id,
            stage_id: params.stage_id,
            ai_name: params.ai_name || 'Assistente Tork',
            ai_persona: params.ai_persona || 'Consultor profissional, educado e prestativo. Especialista em seguros.',
            ai_objective: params.ai_objective || 'Qualificar o interesse do cliente e coletar dados básicos para cotação.',
            ai_custom_rules: params.ai_custom_rules || 'Não prometa valores exatos sem aprovação. Sempre peça CPF para análise.',
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
      queryClient.invalidateQueries({ queryKey: ['crm-ai-settings', pipelineId] });
      toast.success('Configuração de IA salva com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar config de IA:', error);
      toast.error('Erro ao salvar configuração de IA');
    },
  });

  // Toggle ativo/inativo rapidamente
  const toggleActive = useMutation({
    mutationFn: async ({ stageId, isActive }: { stageId: string; isActive: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já existe config para este stage
      const { data: existing } = await supabase
        .from('crm_ai_settings')
        .select('id')
        .eq('stage_id', stageId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('crm_ai_settings')
          .update({ is_active: isActive })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar nova config com o status desejado
        const { error } = await supabase
          .from('crm_ai_settings')
          .insert({
            user_id: user.id,
            stage_id: stageId,
            is_active: isActive,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-ai-settings', pipelineId] });
    },
    onError: (error) => {
      console.error('Erro ao toggle IA:', error);
      toast.error('Erro ao alterar status da automação');
    },
  });

  return {
    aiSettings: aiSettings || [],
    isLoading,
    error,
    upsertSetting,
    toggleActive,
  };
}
