import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BankAccountCard } from "./bancos/BankAccountCard";
import { ConsolidatedBalanceCard } from "./bancos/ConsolidatedBalanceCard";
import { ReconciliationProgressBar } from "./bancos/ReconciliationProgressBar";
import { BankTransactionsTable } from "./bancos/BankTransactionsTable";
import { mockBankTransactions, getReconciliationProgress } from "@/data/mocks/financeiroMocks";
import { useBankAccounts, type BankAccount } from "@/hooks/useBancos";
import { toast } from "@/hooks/use-toast";

interface CaixaTabProps {
  dateRange: DateRange | undefined;
}

export function CaixaTab({ dateRange }: CaixaTabProps) {
  const { data: summary, isLoading } = useBankAccounts();
  const [transactions] = useState(mockBankTransactions); // TODO: Conectar ao banco depois

  const accounts = summary?.accounts?.filter(a => a.isActive) ?? [];
  const totalBalance = summary?.totalBalance ?? 0;
  const activeAccountsCount = summary?.activeAccounts ?? 0;
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
      description: `Editando ${account.bankName}`,
    });
  };

  const handleDeleteBank = (account: BankAccount) => {
    toast({
      title: "Excluir banco",
      description: `Deseja realmente excluir ${account.bankName}?`,
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Gestão de Bancos</h2>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>

        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Gestão de Bancos</h2>
        </div>
        <Button onClick={handleAddBank} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Banco
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-2">
        <ConsolidatedBalanceCard
          totalBalance={totalBalance}
          activeAccounts={activeAccountsCount}
        />
        <ReconciliationProgressBar
          progress={reconciliationProgress}
          pendingCount={pendingCount}
        />
      </div>

      {/* Grid de Contas Bancárias */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-800 rounded-lg">
          <Landmark className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">
            Nenhuma conta bancária cadastrada
          </h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-md">
            Adicione suas contas bancárias para gerenciar saldos, movimentações e conciliação.
          </p>
          <Button onClick={handleAddBank}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={{
                id: account.id,
                bankName: account.bankName,
                accountNumber: account.accountNumber || '',
                accountType: account.accountType,
                balance: account.currentBalance,
                lastSync: account.lastSyncDate || new Date().toISOString(),
                isActive: account.isActive,
                color: account.color,
              }}
              onEdit={() => handleEditBank(account)}
              onDelete={() => handleDeleteBank(account)}
            />
          ))}
        </div>
      )}

      {/* Tabela de Movimentações */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Movimentações Bancárias</h3>
        <BankTransactionsTable transactions={transactions} />
      </div>
    </div>
  );
}
