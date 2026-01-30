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

  const totalAmount = unbankedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <>
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">
          Transações sem Banco Atribuído
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            Você tem <strong>{unbankedTransactions.length} transações</strong> sem banco atribuído,
            totalizando <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Atribua estas transações a bancos para ter um controle mais preciso dos seus saldos bancários.
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
