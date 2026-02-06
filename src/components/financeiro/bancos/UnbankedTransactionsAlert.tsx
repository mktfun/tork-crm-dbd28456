import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUnbankedTransactions } from "@/hooks/useBancos";
import { AssignBankModal } from "./AssignBankModal";

export function UnbankedTransactionsAlert() {
  const { data: unbankedTransactions = [], isLoading } = useUnbankedTransactions(1000);
  const [showAssignModal, setShowAssignModal] = useState(false);

  if (isLoading || unbankedTransactions.length === 0) {
    return null;
  }

  const totalIncome = unbankedTransactions
    .filter(tx => tx.transactionType === 'receita')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalExpense = unbankedTransactions
    .filter(tx => tx.transactionType !== 'receita')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">
          Transações sem Banco Atribuído
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            Você tem <strong>{unbankedTransactions.length} transações</strong> pendentes de vínculo bancário.
          </p>
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-500">Receitas: {formatMoney(totalIncome)}</span>
            <span className="text-rose-500">Despesas: {formatMoney(totalExpense)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Atribua estas transações a bancos para conciliação correta.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setShowAssignModal(true)}
          >
            Atribuir Bancos Agora
          </Button>
        </AlertDescription>
      </Alert>

      <AssignBankModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        transactions={unbankedTransactions}
      />
    </>
  );
}
