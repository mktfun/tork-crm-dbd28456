import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminMetrics {
  total_brokerages: number;
  total_users: number;
  total_policies: number;
  total_clients: number;
  total_ai_requests: number;
  db_size_bytes: number;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async (): Promise<AdminMetrics> => {
      const { data, error } = await supabase.rpc('get_admin_metrics');

      if (error) {
        console.error('Error fetching admin metrics:', error);
        throw error;
      }

      return data as unknown as AdminMetrics;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

// System Settings management
interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSetting[]> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpsertSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      description,
    }: {
      key: string;
      value: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key,
            value,
            description,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração: ' + error.message);
    },
  });
}

export function useDeleteSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Configuração removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover configuração: ' + error.message);
    },
  });
}

// Helper to get a specific setting value
export function getSettingValue(settings: SystemSetting[], key: string): string | null {
  const setting = settings.find((s) => s.key === key);
  return setting?.value || null;
}

// Format bytes to human-readable size
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
