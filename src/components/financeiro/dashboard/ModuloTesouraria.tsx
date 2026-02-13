import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgingReport, useUpcomingReceivables } from "@/hooks/useFinanceiro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AgingBar = ({ item }: { item: any }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{item.bucketRange}</span>
      <span className="text-foreground/80 font-medium">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.bucketAmount)}
      </span>
    </div>
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all")}
        style={{ width: `${Math.min(100, (item.bucketCount / 10) * 100)}%`, backgroundColor: item.bucketColor }}
      />
    </div>
  </div>
);

interface ModuloTesourariaProps {
  onClick?: () => void;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ModuloTesouraria = ({ onClick }: ModuloTesourariaProps) => {
  const { data: agingData, isLoading: isLoadingAging } = useAgingReport();
  const { data: upcomingData, isLoading: isLoadingUpcoming } = useUpcomingReceivables(30);

  // Query para A RECEBER (receitas pendentes)
  const { data: receivableData, isLoading: isLoadingReceivable } = useQuery({
    queryKey: ['tesouraria-receivable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_ledger')
        .select(`
          amount,
          financial_transactions!inner(
            id,
            status,
            is_void,
            user_id
          ),
          financial_accounts!inner(
            type
          )
        `)
        .eq('financial_transactions.status', 'pending')
        .eq('financial_transactions.is_void', false)
        .eq('financial_accounts.type', 'revenue');

      if (error) throw error;

      // Sum absolute amounts
      const total = data?.reduce((acc, item) => acc + Math.abs(item.amount), 0) || 0;
      return total;
    }
  });

  // Query para A PAGAR (despesas pendentes)
  const { data: payableData, isLoading: isLoadingPayable } = useQuery({
    queryKey: ['tesouraria-payable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_ledger')
        .select(`
          amount,
          financial_transactions!inner(
            id,
            status,
            is_void,
            user_id
          ),
          financial_accounts!inner(
            type
          )
        `)
        .eq('financial_transactions.status', 'pending')
        .eq('financial_transactions.is_void', false)
        .eq('financial_accounts.type', 'expense');

      if (error) throw error;

      // Sum absolute amounts
      const total = data?.reduce((acc, item) => acc + Math.abs(item.amount), 0) || 0;
      return total;
    }
  });

  const totalsData = {
    receivable: receivableData || 0,
    payable: payableData || 0
  };
  const isLoadingTotals = isLoadingReceivable || isLoadingPayable;

  const isLoading = isLoadingAging || isLoadingUpcoming || isLoadingTotals;

  return (
    <Card
      className={cn(
        "h-full bg-card/50 border-border transition-all duration-200",
        onClick && "cursor-pointer hover:bg-card/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Tesouraria & Contas
          </span>
          {onClick && (
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna Esquerda: Liquidez */}
            <div className="space-y-4">
              {/* Cards de Saldo */}
              <div className="grid grid-cols-2 gap-3">
                {/* A Receber */}
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="flex items-center gap-2 text-emerald-500 mb-1">
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">A Receber</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalsData?.receivable || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Aberto</p>
                </div>

                {/* A Pagar */}
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                  <div className="flex items-center gap-2 text-rose-500 mb-1">
                    <ArrowDownCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">A Pagar</span>
                  </div>
                  <p className="text-lg font-bold text-rose-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalsData?.payable || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Aberto</p>
                </div>
              </div>

              {/* Próximos Vencimentos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Próximos Vencimentos
                  </h4>
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingData && upcomingData.length > 0 ? upcomingData.slice(0, 5).map((tx, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-foreground/80 truncate max-w-[120px]" title={tx.description}>
                          {tx.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(tx.dueDate), 'dd/MM', { locale: ptBR })}
                        </span>
                        <span className="font-medium text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum recebimento previsto.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Aging Report */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Inadimplência por Período
              </h4>
              <div className="space-y-3">
                {agingData && agingData.length > 0 ? agingData.map((item, index) => (
                  <AgingBar key={index} item={item} />
                )) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma inadimplência registrada.</p>
                )}
              </div>

              {/* Resumo Aging (Opcional, removido hardcoded 5%) */}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuloTesouraria;
