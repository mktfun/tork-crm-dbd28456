import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuloFaturamento } from "@/components/financeiro/dashboard/ModuloFaturamento";
import { ModuloTesouraria } from "@/components/financeiro/dashboard/ModuloTesouraria";
import { ModuloMultiBancos } from "@/components/financeiro/dashboard/ModuloMultiBancos";

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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🔮 Fluxo de Caixa Preditivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">
              Projeção de 90 dias e Análise de Tendências virão aqui (Tarefa 1.6)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceiroExecutivo;
