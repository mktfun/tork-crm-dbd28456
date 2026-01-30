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

interface CaixaTabProps {
  dateRange: DateRange | undefined;
}

export function CaixaTab({ dateRange }: CaixaTabProps) {
  const { data: summary, isLoading } = useBankAccounts();
  
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

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

      {/* Card de Saldo Consolidado */}
      <ConsolidatedBalanceCard
        totalBalance={totalBalance}
        accountCount={activeAccountsCount}
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
          {accounts.map((account) => {
            // Mapear tipo de conta para tipos aceitos pelo BankAccountCard
            const mapAccountType = (type: string): 'corrente' | 'digital' | 'investimento' | 'poupanca' => {
              if (type === 'giro') return 'corrente';
              if (type === 'digital' || type === 'poupanca' || type === 'investimento' || type === 'corrente') {
                return type;
              }
              return 'corrente';
            };

            return (
              <BankAccountCard
                key={account.id}
                account={{
                  id: account.id,
                  bankName: account.bankName,
                  accountNumber: account.accountNumber || '',
                  accountType: mapAccountType(account.accountType),
                  balance: account.currentBalance,
                  label: account.accountType === 'corrente' ? 'Conta Corrente' : 
                         account.accountType === 'poupanca' ? 'Poupança' :
                         account.accountType === 'investimento' ? 'Investimento' : 
                         account.accountType === 'giro' ? 'Conta Giro' : 'Conta',
                  color: account.color || '#3B82F6',
                  icon: account.icon || '🏦',
                  isActive: account.isActive,
                }}
                onEdit={() => handleEditBank(account)}
                onDelete={() => handleDeleteBank(account)}
              />
            );
          })}
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
