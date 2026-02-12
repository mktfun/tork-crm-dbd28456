import { AccountsPayableReceivableTable } from "./tesouraria/AccountsPayableReceivableTable";
import { AgingReportCard } from "./tesouraria/AgingReportCard";
import { UpcomingTransactionsList } from "./tesouraria/UpcomingTransactionsList";
import { Wallet } from "lucide-react";
import { DateRange } from "react-day-picker";

interface TesourariaTabProps {
  dateRange: DateRange | undefined;
}

export function TesourariaTab({ dateRange }: TesourariaTabProps) {
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

      {/* KPI Cards Unified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTransactionsList daysAhead={30} />
        <AgingReportCard defaultType="receivables" />
      </div>

      {/* Main Table */}
      <AccountsPayableReceivableTable />
    </div>
  );
}
