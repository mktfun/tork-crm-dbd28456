import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProducaoData {
    ramo: string;
    total_comissao: number;
    qtd_vendas: number;
    total_premio: number;
}

export function useProducaoData(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['producao-data', startDate, endDate],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            const { data, error } = await supabase.rpc('get_producao_por_ramo' as any, {
                p_user_id: user.id,
                start_range: startDate,
                end_range: endDate
            });

            if (error) throw error;

            // Map RPC response to expected interface
            return (data as any[])?.map(item => ({
                ramo: item.ramo_nome,
                total_comissao: Number(item.total_comissao) || 0,
                qtd_vendas: Number(item.total_apolices) || 0,
                total_premio: Number(item.total_premio) || 0,
            })) as ProducaoData[];
        },
        enabled: !!startDate && !!endDate
    });
}
