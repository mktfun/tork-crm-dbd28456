import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

// Interface que espelha o retorno da função SQL calculate_projected_cash_flow
export interface ProjectedCashFlowDataPoint {
  date: string;
  projected_balance: number;
  inflows: number;
  outflows: number;
}

interface UseProjectedCashFlowOptions {
  days?: number;
  enabled?: boolean;
}

/**
 * Hook principal para buscar os dados de projeção de fluxo de caixa.
 * Conecta-se à função RPC 'calculate_projected_cash_flow' do Supabase.
 */
export const useProjectedCashFlow = ({ days = 90, enabled = true }: UseProjectedCashFlowOptions = {}) => {
  return useQuery({
    queryKey: ["projected-cash-flow", days],
    queryFn: async (): Promise<ProjectedCashFlowDataPoint[]> => {
      const { data, error } = await supabase.rpc("calculate_projected_cash_flow", {
        p_days: days,
      });

      if (error) {
        console.error("Erro ao calcular fluxo de caixa preditivo:", error);
        throw error;
      }

      // Garante a tipagem correta do retorno, convertendo se necessário
      return (data || []) as unknown as ProjectedCashFlowDataPoint[];
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache (dados financeiros não mudam a cada segundo)
    retry: 2,
  });
};

/**
 * Hook derivado para calcular KPIs baseados na projeção.
 * Usa useMemo para evitar recálculos desnecessários no render.
 */
export const useProjectedCashFlowKPIs = (days: number = 90) => {
  const { data, isLoading, error } = useProjectedCashFlow({ days });

  const kpis = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        minBalance: 0,
        maxBalance: 0,
        minBalanceDate: null as string | null,
        endBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        daysAtRisk: 0, // Dias com saldo negativo
      };
    }

    let minBalance = data[0].projected_balance;
    let maxBalance = data[0].projected_balance;
    let minBalanceDate: string | null = data[0].date;
    let daysAtRisk = 0;
    let totalInflows = 0;
    let totalOutflows = 0;

    data.forEach((point) => {
      // Min/Max e Datas Críticas
      if (point.projected_balance < minBalance) {
        minBalance = point.projected_balance;
        minBalanceDate = point.date;
      }
      if (point.projected_balance > maxBalance) {
        maxBalance = point.projected_balance;
      }

      // Risco
      if (point.projected_balance < 0) {
        daysAtRisk++;
      }

      // Totais do período
      totalInflows += Number(point.inflows || 0);
      totalOutflows += Number(point.outflows || 0);
    });

    const endBalance = data[data.length - 1].projected_balance;

    return {
      minBalance,
      maxBalance,
      minBalanceDate,
      endBalance,
      totalInflows,
      totalOutflows,
      daysAtRisk,
    };
  }, [data]);

  return {
    data, // Retorna os dados brutos também para gráficos
    kpis,
    isLoading,
    error,
  };
};
