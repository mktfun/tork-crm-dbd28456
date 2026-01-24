import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VoiceTone = 'technical' | 'friendly' | 'honest';

export interface GlobalAiConfig {
  id: string;
  user_id: string;
  agent_name: string;
  company_name: string | null;
  voice_tone: VoiceTone;
  base_instructions: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UpsertGlobalConfigParams {
  agent_name?: string;
  company_name?: string;
  voice_tone?: VoiceTone;
  base_instructions?: string;
  onboarding_completed?: boolean;
}

export function useGlobalAiConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['global-ai-config', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_ai_global_config')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as GlobalAiConfig | null;
    },
    enabled: !!user
  });

  const upsertConfig = useMutation({
    mutationFn: async (params: UpsertGlobalConfigParams) => {
      const existingConfig = configQuery.data;

      if (existingConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from('crm_ai_global_config')
          .update({
            ...params,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('crm_ai_global_config')
          .insert({
            user_id: user!.id,
            ...params
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-ai-config'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar configuração');
      console.error(error);
    }
  });

  const completeOnboarding = useMutation({
    mutationFn: async (params: Omit<UpsertGlobalConfigParams, 'onboarding_completed'>) => {
      const existingConfig = configQuery.data;

      const configData = {
        ...params,
        onboarding_completed: true
      };

      if (existingConfig) {
        const { data, error } = await supabase
          .from('crm_ai_global_config')
          .update({
            ...configData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('crm_ai_global_config')
          .insert({
            user_id: user!.id,
            ...configData
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-ai-config'] });
      toast.success('Configuração do agente salva com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar configuração');
      console.error(error);
    }
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    hasCompletedOnboarding: configQuery.data?.onboarding_completed ?? false,
    upsertConfig,
    completeOnboarding
  };
}
