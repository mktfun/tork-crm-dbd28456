import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProducaoData {
    ramo: string;
    total_comissao: number;
    qtd_vendas: number;
}

export function useProducaoData(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['producao-data', startDate, endDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_producao_por_ramo' as any, {
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (error) throw error;

            return data as ProducaoData[];
        },
        enabled: !!startDate && !!endDate
    });
}
