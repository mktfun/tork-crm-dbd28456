import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SummaryResult {
  content: string;
  created_at: string;
  cached: boolean;
}

type SummaryScope = 'day' | 'week' | 'month';
type SummaryFocus = 'general' | 'finance' | 'crm';

export function useStrategicSummary(focus: SummaryFocus = 'general') {
  const [scope, setScope] = useState<SummaryScope>('day');
  const queryClient = useQueryClient();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['strategic-summary', scope, focus],
    queryFn: async (): Promise<SummaryResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('generate-summary', {
        body: { scope, focus, forceRefresh: false },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to fetch summary');
      return response.data as SummaryResult;
    },
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Invalidate cache and force refresh
    queryClient.setQueryData(['strategic-summary', scope, focus], undefined);
    
    const response = await supabase.functions.invoke('generate-summary', {
      body: { scope, focus, forceRefresh: true },
    });

    if (!response.error && response.data) {
      queryClient.setQueryData(['strategic-summary', scope, focus], response.data);
    }
  }, [scope, focus, queryClient]);

  return {
    summary: data?.content || '',
    createdAt: data?.created_at || '',
    isCached: data?.cached || false,
    isLoading,
    isFetching,
    error,
    scope,
    setScope,
    refresh,
  };
}
