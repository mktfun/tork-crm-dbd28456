import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalBrokerages: number;
  totalUsers: number;
  totalAIRequests: number;
  systemStatus: 'Operacional' | 'Degradado' | 'Manutenção';
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Count brokerages
      const { count: brokeragesCount, error: brokeragesError } = await supabase
        .from('brokerages')
        .select('*', { count: 'exact', head: true });

      if (brokeragesError) throw brokeragesError;

      // Count profiles (users)
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Count AI usage logs
      const { count: aiCount, error: aiError } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true });

      if (aiError) throw aiError;

      return {
        totalBrokerages: brokeragesCount || 0,
        totalUsers: usersCount || 0,
        totalAIRequests: aiCount || 0,
        systemStatus: 'Operacional',
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface AIUsageByProvider {
  provider: string;
  count: number;
  tokens: number;
}

export function useAIUsageLogs(days: number = 7) {
  return useQuery({
    queryKey: ['ai-usage-logs', days],
    queryFn: async (): Promise<AIUsageByProvider[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('provider, tokens_used')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Aggregate by provider
      const aggregated = (data || []).reduce((acc, log) => {
        const key = log.provider || 'unknown';
        if (!acc[key]) {
          acc[key] = { provider: key, count: 0, tokens: 0 };
        }
        acc[key].count += 1;
        acc[key].tokens += log.tokens_used || 0;
        return acc;
      }, {} as Record<string, AIUsageByProvider>);

      return Object.values(aggregated);
    },
    staleTime: 1000 * 60 * 5,
  });
}

interface DailyAIUsage {
  date: string;
  gemini: number;
  mistral: number;
  openai: number;
}

export function useAIUsageByDay(days: number = 7) {
  return useQuery({
    queryKey: ['ai-usage-by-day', days],
    queryFn: async (): Promise<DailyAIUsage[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('provider, tokens_used, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Create a map for each day
      const dailyMap: Record<string, DailyAIUsage> = {};
      
      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateKey = date.toISOString().split('T')[0];
        dailyMap[dateKey] = { date: dateKey, gemini: 0, mistral: 0, openai: 0 };
      }

      // Aggregate data
      (data || []).forEach((log) => {
        const dateKey = log.created_at?.split('T')[0];
        if (dateKey && dailyMap[dateKey]) {
          const provider = (log.provider || '').toLowerCase();
          if (provider === 'gemini') {
            dailyMap[dateKey].gemini += log.tokens_used || 0;
          } else if (provider === 'mistral') {
            dailyMap[dateKey].mistral += log.tokens_used || 0;
          } else if (provider === 'openai') {
            dailyMap[dateKey].openai += log.tokens_used || 0;
          }
        }
      });

      return Object.values(dailyMap);
    },
    staleTime: 1000 * 60 * 5,
  });
}
