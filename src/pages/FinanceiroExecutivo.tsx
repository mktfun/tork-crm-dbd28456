import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📊 Faturamento & Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">
              KPIs de Faturamento e Gráficos de Vendas virão aqui (Tarefa 1.3)
            </p>
          </CardContent>
        </Card>

        {/* Módulo 2: Tesouraria (Top-Right) */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              💰 Tesouraria & Contas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">
              Aging List e Contas a Receber/Pagar virão aqui (Tarefa 1.4)
            </p>
          </CardContent>
        </Card>

        {/* Módulo 3: Multi-Bancos (Bottom-Left) */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🏦 Saldos Bancários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">
              Gestão Multi-Bancos e Consolidação virão aqui (Tarefa 1.5)
            </p>
          </CardContent>
        </Card>

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
