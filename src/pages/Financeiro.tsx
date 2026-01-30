import { Wallet } from "lucide-react";
import FinanceiroERP from "./FinanceiroERP";

const Financeiro = () => {
  return (
    <div className="space-y-6">
      {/* Header Unificado */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão Financeira</h1>
          <p className="text-sm text-muted-foreground">
            Controle total de fluxo de caixa, faturamento e contas.
          </p>
        </div>
      </div>

      {/* Conteúdo Unificado - Apenas o ERP com tabs internas */}
      <FinanceiroERP />
    </div>
  );
};

export default Financeiro;
