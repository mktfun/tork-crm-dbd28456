
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIConfig {
    id: string;
    user_id: string;
    model: string;
    temperature: number;
    is_active: boolean;
}

export interface AIPrompt {
    id: string;
    config_id: string;
    module_type: 'identity' | 'rules' | 'tools' | 'knowledge_base' | 'custom';
    content: string;
    is_enabled: boolean;
    position: number;
}

export function useAIConfig() {
    const queryClient = useQueryClient();

    const { data: config, isLoading } = useQuery({
        queryKey: ['ai-config'],
        queryFn: async () => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) return null;

            const { data, error } = await supabase
                .from('crm_ai_config')
                .select('*')
                .eq('user_id', session.session.user.id)
                .maybeSingle();

            if (error) throw error;
            return data as AIConfig;
        },
    });

    const upsertConfig = useMutation({
        mutationFn: async (newConfig: Partial<AIConfig>) => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) throw new Error('No session');

            const { error } = await supabase
                .from('crm_ai_config')
                .upsert({
                    user_id: session.session.user.id,
                    ...newConfig
                })
                .select()
                .single();

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-config'] });
            toast.success('Configuração salva com sucesso!');
        },
        onError: (error) => {
            console.error('Error saving config:', error);
            toast.error('Erro ao salvar configuração.');
        },
    });

    return { config, isLoading, upsertConfig };
}

export function useAIPrompts(configId?: string) {
    const queryClient = useQueryClient();

    const { data: prompts, isLoading } = useQuery({
        queryKey: ['ai-prompts', configId],
        queryFn: async () => {
            if (!configId) return [];
            const { data, error } = await supabase
                .from('crm_ai_prompts')
                .select('*')
                .eq('config_id', configId)
                .order('position', { ascending: true });

            if (error) throw error;
            return data as AIPrompt[];
        },
        enabled: !!configId,
    });

    const upsertPrompt = useMutation({
        mutationFn: async (prompt: Partial<AIPrompt>) => {
            if (!configId) throw new Error('No config ID');
            const { error } = await supabase
                .from('crm_ai_prompts')
                .upsert({ ...prompt, config_id: configId })
                .select();
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
            toast.success('Prompt atualizado!');
        },
        onError: () => toast.error('Erro ao salvar prompt.'),
    });

    const deletePrompt = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_ai_prompts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
            toast.success('Módulo removido.');
        },
    });

    return { prompts, isLoading, upsertPrompt, deletePrompt };
}
