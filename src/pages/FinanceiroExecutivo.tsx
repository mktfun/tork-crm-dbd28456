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

      {/* Grid Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500">
            Módulos serão adicionados nas próximas tarefas (Sprint 1)
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroExecutivo;
