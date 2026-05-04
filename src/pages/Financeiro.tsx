import { Wallet } from "lucide-react";
import FinanceiroERP from "./FinanceiroERP";

const Financeiro = () => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-4 md:p-6">
      <div className="space-y-6 flex flex-col h-full w-full max-w-[1800px] mx-auto">
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
    </div>
  );
};

export default Financeiro;
