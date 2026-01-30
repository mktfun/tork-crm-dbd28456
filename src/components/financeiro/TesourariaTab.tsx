import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Wallet } from "lucide-react";
import { ReceivablesList } from "./tesouraria/ReceivablesList";
import { AgingReportCard } from "./tesouraria/AgingReportCard";
import { AccountsPayableReceivableTable } from "./tesouraria/AccountsPayableReceivableTable";
import {
  mockReceivables,
  mockAgingReport,
  mockAccountsPayableReceivable,
  getTotalReceivables,
  getTotalAging,
} from "@/data/mocks/financeiroMocks";

interface TesourariaTabProps {
  dateRange: DateRange | undefined;
}

export function TesourariaTab({ dateRange }: TesourariaTabProps) {
  const [receivables] = useState(mockReceivables);
  const [agingBuckets] = useState(mockAgingReport);
  const [transactions] = useState(mockAccountsPayableReceivable);

  const totalReceivables = getTotalReceivables();
  const totalAging = getTotalAging();

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
        <ReceivablesList 
          receivables={receivables} 
          totalAmount={totalReceivables} 
        />
        <AgingReportCard 
          buckets={agingBuckets} 
          totalAmount={totalAging} 
        />
      </div>

      {/* Tabela de Contas a Pagar e Receber */}
      <AccountsPayableReceivableTable transactions={transactions} />
    </div>
  );
}
