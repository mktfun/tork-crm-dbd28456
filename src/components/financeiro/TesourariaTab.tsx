import { AccountsPayableReceivableTable } from "./tesouraria/AccountsPayableReceivableTable";
import { AgingReportCard } from "./tesouraria/AgingReportCard";
import { ReceivablesList } from "./tesouraria/ReceivablesList";
import { PayablesList } from "./tesouraria/PayablesList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet } from "lucide-react";
import { DateRange } from "react-day-picker";

interface TesourariaTabProps {
  dateRange: DateRange | undefined;
}

export function TesourariaTab({ dateRange }: TesourariaTabProps) {
  return (
    <ScrollArea className="h-[calc(100vh-220px)] w-full">
      <div className="space-y-6 pr-4 pb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ReceivablesList daysAhead={30} />
          <PayablesList daysAhead={30} />
          <AgingReportCard defaultType="receivables" />
        </div>

        {/* Main Table */}
        <AccountsPayableReceivableTable />
      </div>
    </ScrollArea>
  );
}
