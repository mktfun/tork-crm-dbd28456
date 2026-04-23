import { AccountsPayableReceivableTable } from "./tesouraria/AccountsPayableReceivableTable";
import { AgingReportCard } from "./tesouraria/AgingReportCard";
import { UpcomingTransactionsList } from "./tesouraria/UpcomingTransactionsList";
import { ReceivablesBySeguradora } from "./tesouraria/ReceivablesBySeguradora";
import { Wallet, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { DateRange } from "react-day-picker";
import { usePendingTotals } from "@/hooks/useFinanceiro";
import { GlassKpiCard } from "./shared/GlassKpiCard";

interface TesourariaTabProps {
  dateRange: DateRange | undefined;
}

export function TesourariaTab({ dateRange }: TesourariaTabProps) {
  const { data: totals, isLoading } = usePendingTotals();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Calcula o fluxo de caixa esperado (A Receber - A Pagar)
  const netPending = (totals?.receivable || 0) - (totals?.payable || 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tesouraria</h2>
          <p className="text-sm text-muted-foreground">
            Gestão de recebíveis, contas a pagar e relatórios de aging
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassKpiCard
          title="A Receber (Geral)"
          value={isLoading ? "Carregando..." : formatCurrency(totals?.receivable || 0)}
          subtitle="Total pendente"
          icon={ArrowUpRight}
          iconClassName="text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
          className="border-emerald-500/20"
        />
        <GlassKpiCard
          title="A Pagar (Geral)"
          value={isLoading ? "Carregando..." : formatCurrency(totals?.payable || 0)}
          subtitle="Total pendente"
          icon={ArrowDownRight}
          iconClassName="text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
          className="border-rose-500/20"
        />
        <GlassKpiCard
          title="Saldo Líquido Projetado"
          value={isLoading ? "Carregando..." : formatCurrency(netPending)}
          subtitle="Receitas - Despesas"
          icon={Scale}
          iconClassName={netPending >= 0 ? "text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"}
        />
      </div>

      {/* Grid de Operações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTransactionsList daysAhead={30} />
        <AgingReportCard defaultType="receivables" />
      </div>

      {/* A Receber por Seguradora */}
      <ReceivablesBySeguradora />

      {/* Main Table */}
      <AccountsPayableReceivableTable />
    </div>
  );
}

