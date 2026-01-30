import { DateRange } from "react-day-picker";
import { Wallet } from "lucide-react";
import { ReceivablesList } from "./tesouraria/ReceivablesList";
import { AgingReportCard } from "./tesouraria/AgingReportCard";
import { AccountsPayableReceivableTable } from "./tesouraria/AccountsPayableReceivableTable";

interface TesourariaTabProps {
  dateRange: DateRange | undefined;
}

export function TesourariaTab({ dateRange }: TesourariaTabProps) {
  return (
    <div className="space-y-6">
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

      {/* Grid de Cards Superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReceivablesList daysAhead={30} />
        <AgingReportCard />
      </div>

      {/* Tabela de Contas a Pagar e Receber */}
      <AccountsPayableReceivableTable />
    </div>
  );
}
