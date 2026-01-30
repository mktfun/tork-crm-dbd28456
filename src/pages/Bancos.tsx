import { useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankAccountCard } from "@/components/financeiro/bancos/BankAccountCard";
import { ConsolidatedBalanceCard } from "@/components/financeiro/bancos/ConsolidatedBalanceCard";
import { ReconciliationProgressBar } from "@/components/financeiro/bancos/ReconciliationProgressBar";
import { BankTransactionsTable } from "@/components/financeiro/bancos/BankTransactionsTable";
import {
  mockBankAccounts,
  mockBankTransactions,
  getTotalBalance,
  getReconciliationProgress,
  BankAccount,
} from "@/data/mocks/financeiroMocks";
import { toast } from "@/hooks/use-toast";

const Bancos = () => {
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão Bancária</h1>
            <p className="text-sm text-muted-foreground">
              Saldos, movimentações e conciliação bancária
            </p>
          </div>
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
        <h2 className="text-lg font-semibold mb-4">Módulo Multi-Bancos</h2>
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
};

export default Bancos;
