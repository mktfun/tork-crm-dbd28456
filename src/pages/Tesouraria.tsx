import { useState } from "react";
import { Wallet } from "lucide-react";
import { ReceivablesList } from "@/components/financeiro/tesouraria/ReceivablesList";
import { AgingReportCard } from "@/components/financeiro/tesouraria/AgingReportCard";
import { AccountsPayableReceivableTable } from "@/components/financeiro/tesouraria/AccountsPayableReceivableTable";
import {
  mockReceivables,
  mockAgingReport,
  mockAccountsPayableReceivable,
  getTotalReceivables,
  getTotalAging,
} from "@/data/mocks/financeiroMocks";

const Tesouraria = () => {
  const [receivables] = useState(mockReceivables);
  const [agingBuckets] = useState(mockAgingReport);
  const [transactions] = useState(mockAccountsPayableReceivable);

  const totalReceivables = getTotalReceivables();
  const totalAging = getTotalAging();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tesouraria</h1>
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
};

export default Tesouraria;
