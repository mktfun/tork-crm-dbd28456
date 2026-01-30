import { Wallet } from "lucide-react";
import { ReceivablesList } from "@/components/financeiro/tesouraria/ReceivablesList";
import { AgingReportCard } from "@/components/financeiro/tesouraria/AgingReportCard";
import { AccountsPayableReceivableTable } from "@/components/financeiro/tesouraria/AccountsPayableReceivableTable";

const Tesouraria = () => {
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
        <ReceivablesList daysAhead={30} />
        <AgingReportCard />
      </div>

      {/* Tabela de Contas a Pagar e Receber */}
      <AccountsPayableReceivableTable />
    </div>
  );
};

export default Tesouraria;
