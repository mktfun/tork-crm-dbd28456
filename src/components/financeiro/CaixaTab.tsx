import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankAccountCard } from "./bancos/BankAccountCard";
import { ConsolidatedBalanceCard } from "./bancos/ConsolidatedBalanceCard";
import { ReconciliationProgressBar } from "./bancos/ReconciliationProgressBar";
import { BankTransactionsTable } from "./bancos/BankTransactionsTable";
import {
  mockBankAccounts,
  mockBankTransactions,
  getTotalBalance,
  getReconciliationProgress,
  BankAccount,
} from "@/data/mocks/financeiroMocks";
import { toast } from "@/hooks/use-toast";

interface CaixaTabProps {
  dateRange: DateRange | undefined;
}

export function CaixaTab({ dateRange }: CaixaTabProps) {
  const [accounts] = useState(mockBankAccounts);
  const [transactions] = useState(mockBankTransactions);

  const totalBalance = getTotalBalance();
  const activeAccountsCount = accounts.filter(a => a.isActive).length;
  const reconciliationProgress = getReconciliationProgress();
  const pendingCount = transactions.filter(t => t.reconciliationStatus === 'pendente').length;

  const handleAddBank = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de adicionar banco será implementada em breve.",
    });
  };

  const handleEditBank = (account: BankAccount) => {
    toast({
      title: "Editar banco",
      description: `Editando ${account.bankName} - ${account.accountNumber}`,
    });
  };

  const handleDeleteBank = (account: BankAccount) => {
    toast({
      title: "Excluir banco",
      description: `Deseja realmente excluir ${account.bankName}?`,
      variant: "destructive",
    });
  };

  const handleRefresh = () => {
    toast({
      title: "Atualizando",
      description: "Saldos atualizados com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestão Bancária</h2>
          <p className="text-sm text-muted-foreground">
            Saldos, movimentações e conciliação bancária
          </p>
        </div>
        <Button onClick={handleAddBank} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Banco
        </Button>
      </div>

      {/* Saldo Consolidado */}
      <ConsolidatedBalanceCard
        totalBalance={totalBalance}
        accountCount={activeAccountsCount}
        onRefresh={handleRefresh}
      />

      {/* Cards de Bancos */}
      <div>
        <h3 className="text-base font-semibold mb-4">Módulo Multi-Bancos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              onEdit={handleEditBank}
              onDelete={handleDeleteBank}
            />
          ))}
        </div>
      </div>

      {/* Barra de Conciliação */}
      <ReconciliationProgressBar
        progress={reconciliationProgress}
        pendingCount={pendingCount}
      />

      {/* Tabela de Movimentações */}
      <BankTransactionsTable transactions={transactions} />
    </div>
  );
}
