import { ModuloFaturamento } from "@/components/financeiro/dashboard/ModuloFaturamento";
import { ModuloTesouraria } from "@/components/financeiro/dashboard/ModuloTesouraria";
import { ModuloMultiBancos } from "@/components/financeiro/dashboard/ModuloMultiBancos";
import { ModuloFluxoCaixaPreditivo } from "@/components/financeiro/dashboard/ModuloFluxoCaixaPreditivo";

const FinanceiroExecutivo = () => {
  return (
    <div className="space-y-6">

      {/* Container do Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linha 1: Tesouraria (Largura Total) */}
        <div className="col-span-1 lg:col-span-2 h-full">
          <ModuloTesouraria />
        </div>

        {/* Linha 2: Coluna Esquerda - Faturamento */}
        <div className="h-full">
          <ModuloFaturamento />
        </div>

        {/* Linha 2: Coluna Direita - Bancos */}
        <div className="h-full">
          <ModuloMultiBancos />
        </div>

        {/* Linha 3: Fluxo de Caixa (Largura Total) */}
        <div className="col-span-1 lg:col-span-2 h-full">
          <ModuloFluxoCaixaPreditivo />
        </div>
      </div>
    </div>
  );
};

export default FinanceiroExecutivo;
