import { useState } from "react";
import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BankAccountCard } from "./bancos/BankAccountCard";
import { AddBankAccountModal } from "./bancos/AddBankAccountModal";
import { EditBankAccountModal } from "./bancos/EditBankAccountModal";
import { DeleteBankAccountDialog } from "./bancos/DeleteBankAccountDialog";
import { BankHistorySheet } from "./bancos/BankHistorySheet";
import { useBankAccounts, type BankAccount } from "@/hooks/useBancos";

export function BankAccountsSection() {
  const { data: summary, isLoading } = useBankAccounts();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);

  const banks = summary?.accounts ?? [];

  const handleEditBank = (account: BankAccount) => {
    setEditingAccount(account);
  };

  const handleDeleteBank = (account: BankAccount) => {
    setDeletingAccount(account);
  };

  const handleOpenHistory = (account: BankAccount) => {
    setSelectedBank(account);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Bancos Cadastrados</CardTitle>
          </div>
          <AddBankAccountModal />
        </div>
        <CardDescription>
          Gerencie as contas bancárias da sua corretora
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : banks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma conta bancária cadastrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {banks.map((bank) => (
              <BankAccountCard
                key={bank.id}
                account={bank}
                onClick={handleOpenHistory}
                onEdit={handleEditBank}
                onDelete={handleDeleteBank}
              />
            ))}
          </div>
        )}
      </CardContent>

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
      <BankHistorySheet
        bankAccountId={selectedBank?.id ?? null}
        bankName={selectedBank?.bankName ?? ''}
        bankColor={selectedBank?.color}
        currentBalance={selectedBank?.currentBalance}
        isOpen={!!selectedBank}
        onClose={() => setSelectedBank(null)}
      />
    </Card>
  );
}
