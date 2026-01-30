import { ModuloFaturamento } from "@/components/financeiro/dashboard/ModuloFaturamento";
import { ModuloTesouraria } from "@/components/financeiro/dashboard/ModuloTesouraria";
import { ModuloMultiBancos } from "@/components/financeiro/dashboard/ModuloMultiBancos";
import { ModuloFluxoCaixaPreditivo } from "@/components/financeiro/dashboard/ModuloFluxoCaixaPreditivo";

const FinanceiroExecutivo = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">
          Dashboard Financeiro Executivo
        </h1>
        <p className="text-zinc-400">
          Visão consolidada de faturamento, tesouraria e fluxo de caixa.
        </p>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Módulo 1: Faturamento (Top-Left) */}
        <ModuloFaturamento />

        {/* Módulo 2: Tesouraria (Top-Right) */}
        <ModuloTesouraria />

        {/* Módulo 3: Multi-Bancos (Bottom-Left) */}
        <ModuloMultiBancos />

        {/* Módulo 4: Fluxo de Caixa (Bottom-Right) */}
        <ModuloFluxoCaixaPreditivo />
      </div>
    </div>
  );
};

export default FinanceiroExecutivo;
