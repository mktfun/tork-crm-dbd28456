import { useState } from "react";
import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BankAccountCard } from "./bancos/BankAccountCard";
import { AddBankAccountModal } from "./bancos/AddBankAccountModal";
import { mockBankAccounts, BankAccount } from "@/data/mocks/financeiroMocks";
import { toast } from "@/hooks/use-toast";

export function BankAccountsSection() {
  const [banks] = useState(mockBankAccounts);

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <BankAccountCard
              key={bank.id}
              account={bank}
              onEdit={handleEditBank}
              onDelete={handleDeleteBank}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
