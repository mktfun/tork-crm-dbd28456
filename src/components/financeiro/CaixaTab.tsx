import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Landmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BankAccountCard } from "./bancos/BankAccountCard";
import { ConsolidatedBalanceCard } from "./bancos/ConsolidatedBalanceCard";
import { UnbankedTransactionsAlert } from "./bancos/UnbankedTransactionsAlert";
import { AddBankAccountModal } from "./bancos/AddBankAccountModal";
import { EditBankAccountModal } from "./bancos/EditBankAccountModal";
import { DeleteBankAccountDialog } from "./bancos/DeleteBankAccountDialog";
import { useBankAccounts, type BankAccount } from "@/hooks/useBancos";
import { BankDashboardView } from "./bancos/BankDashboardView";

interface CaixaTabProps {
  dateRange: DateRange | undefined;
}

export function CaixaTab({ dateRange }: CaixaTabProps) {
  const { data: summary, isLoading } = useBankAccounts();

  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const accounts = summary?.accounts?.filter(a => a.isActive) ?? [];
  const totalBalance = summary?.totalBalance ?? 0;
  const activeAccountsCount = summary?.activeAccounts ?? 0;

  const handleEditBank = (account: BankAccount) => {
    setEditingAccount(account);
  };

  const handleDeleteBank = (account: BankAccount) => {
    setDeletingAccount(account);
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

  // Se tiver banco selecionado, mostra dashboard do banco
  if (selectedBankId) {
    return (
      <BankDashboardView
        bankId={selectedBankId}
        onBack={() => setSelectedBankId(null)}
      />
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
        <AddBankAccountModal />
      </div>

      {/* Alert de Transações sem Banco */}
      <UnbankedTransactionsAlert />

      {/* Card de Saldo Consolidado - clicável */}
      <ConsolidatedBalanceCard
        totalBalance={totalBalance}
        accountCount={activeAccountsCount}
        onClick={() => setSelectedBankId('todos')}
      />

      {/* Grid de Contas Bancárias */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-800 rounded-lg">
          <Landmark className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">
            Nenhuma conta bancária cadastrada
          </h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-md">
            Adicione suas contas bancárias para gerenciar saldos e movimentações.
            Você também poderá atribuir transações existentes a estas contas.
          </p>
          <AddBankAccountModal />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              onClick={() => setSelectedBankId(account.id)}
              onEdit={() => handleEditBank(account)}
              onDelete={() => handleDeleteBank(account)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <EditBankAccountModal
        account={editingAccount}
        open={!!editingAccount}
        onClose={() => setEditingAccount(null)}
      />

      <DeleteBankAccountDialog
        account={deletingAccount}
        open={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
      />
    </div>
  );
}

