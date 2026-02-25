import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { getCurrentMonthRange } from '@/utils/dateUtils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { VisaoGeralCarteira } from '@/components/reports/VisaoGeralCarteira';
import { RelatorioFaturamento } from '@/components/reports/RelatorioFaturamento';
import { FiltrosAvancados } from '@/components/reports/FiltrosAvancados';
import { SkeletonKpiReports } from '@/components/reports/SkeletonKpiReports';
import { SkeletonEnhancedCharts } from '@/components/reports/SkeletonEnhancedCharts';
import { EstadoVazio } from '@/components/reports/EstadoVazio';
import { PlaceholderGraficos } from '@/components/reports/PlaceholderGraficos';
import { EnhancedGrowthChart } from '@/components/reports/enhanced/EnhancedGrowthChart';
import { EnhancedProducerPerformanceChart } from '@/components/reports/enhanced/EnhancedProducerPerformanceChart';
import { EnhancedExpirationCalendarChart } from '@/components/reports/enhanced/EnhancedExpirationCalendarChart';
import { AdimplenciaDonut } from '@/components/reports/AdimplenciaDonut';
import { DreCompactoBar } from '@/components/reports/DreCompactoBar';
import { AlertaAtrasoFinanceiro } from '@/components/reports/AlertaAtrasoFinanceiro';
import { useFilteredDataForReports } from '@/hooks/useFilteredDataForReports';
import { useClientesPreviewWithStats } from '@/hooks/useClientesPreviewWithStats';
import { useApolicesPreview } from '@/hooks/useApolicesPreview';
import PreviewCard from '@/components/PreviewCard';
import { KpiCard } from '@/components/reports/KpiCard';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { BranchDistributionChart } from '@/components/dashboard/charts/BranchDistributionChart';
import { CompanyDistributionChart } from '@/components/dashboard/charts/CompanyDistributionChart';
import { ExportManagementModal } from '@/components/reports/ExportManagementModal';

interface FiltrosGlobais {
  intervalo: DateRange | undefined;
  seguradoraIds: string[];
  ramos: string[];
  produtorIds: string[];
  statusIds: string[];
  onlyConciled?: boolean;
}

export default function Reports() {
  const [filtrosGlobais, setFiltrosGlobais] = useState<FiltrosGlobais>({
    intervalo: getCurrentMonthRange(),
    seguradoraIds: [],
    ramos: [],
    produtorIds: [],
    statusIds: [],
    onlyConciled: false,
  });

  const previewFilters = {
    seguradoraId: (filtrosGlobais.seguradoraIds && filtrosGlobais.seguradoraIds[0]) || null,
    ramo: (filtrosGlobais.ramos && filtrosGlobais.ramos[0]) || null,
  } as const;
  const { data: clientesPreview } = useClientesPreviewWithStats(previewFilters);
  const { data: apolicesPreview } = useApolicesPreview(previewFilters);
  const isFilterActive = Boolean(
    (filtrosGlobais.seguradoraIds && filtrosGlobais.seguradoraIds.length > 0) ||
    (filtrosGlobais.ramos && filtrosGlobais.ramos.length > 0)
  );

  const {
    apolicesFiltradas,
    clientesFiltrados,
    transacoesFiltradas,
    seguradoras,
    ramosDisponiveis,
    statusDisponiveis,
    produtores,
    dadosEvolucaoCarteira,
    dadosPerformanceProdutor,
    dadosVencimentosCriticos,
    branchDistributionDataFromTransactions,
    companyDistributionDataFromTransactions,
    totalGanhos,
    totalPerdas,
    saldoLiquido,
    temFiltrosAtivos,
    temDados,
    isLoading
  } = useFilteredDataForReports(filtrosGlobais);

  const handleFiltrosChange = (novosFiltros: FiltrosGlobais) => {
    setFiltrosGlobais(novosFiltros);
  };

  const clearAllFilters = () => {
    handleFiltrosChange({
      intervalo: filtrosGlobais.intervalo,
      seguradoraIds: [],
      ramos: [],
      produtorIds: [],
      statusIds: []
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
          <p className="text-muted-foreground">Central de inteligência para análise completa da carteira e tomada de decisões estratégicas</p>
        </div>
        <ExportManagementModal
          initialDateRange={filtrosGlobais.intervalo}
          filtrosGlobais={filtrosGlobais}
          seguradoras={seguradoras}
          ramosDisponiveis={ramosDisponiveis}
          disabled={isLoading}
        />
      </div>

      <FiltrosAvancados
        filtros={filtrosGlobais}
        onFiltrosChange={handleFiltrosChange}
        seguradoras={seguradoras}
        ramos={ramosDisponiveis}
        produtores={produtores}
        statusDisponiveis={statusDisponiveis}
      />

      <div className="space-y-6">
        {isLoading ? (
          <>
            <SkeletonKpiReports />
            <SkeletonKpiReports />
            <SkeletonEnhancedCharts />
          </>
        ) : !temDados ? (
          <EstadoVazio onLimparFiltros={clearAllFilters} temFiltrosAtivos={temFiltrosAtivos} />
        ) : (
          <>
            <VisaoGeralCarteira clientes={clientesFiltrados} apolices={apolicesFiltradas} />

            {/* Resumo Financeiro Geral (Faturamento) */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Resumo Financeiro Geral</h2>
                <p className="text-sm text-muted-foreground">Análise de fluxo de caixa real da corretora (transações efetivadas)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="Total de Ganhos"
                  value={formatCurrency(totalGanhos)}
                  subtitle="Receitas realizadas no período"
                  icon={TrendingUp}
                  trend="up"
                  trendValue={`${((transacoesFiltradas || []).filter(t => t.nature === 'RECEITA' && (t.status === 'PAGO' || t.status === 'REALIZADO')).length)} transações`}
                />
                <KpiCard
                  title="Total de Perdas"
                  value={formatCurrency(totalPerdas)}
                  subtitle="Despesas realizadas no período"
                  icon={TrendingDown}
                  trend="down"
                  trendValue={`${((transacoesFiltradas || []).filter(t => t.nature === 'DESPESA' && (t.status === 'PAGO' || t.status === 'REALIZADO')).length)} transações`}
                />
                <KpiCard
                  title="Saldo Líquido"
                  value={formatCurrency(saldoLiquido)}
                  subtitle="Ganhos - Perdas"
                  icon={DollarSign}
                  trend={saldoLiquido > 0 ? 'up' : saldoLiquido < 0 ? 'down' : 'neutral'}
                  trendValue={saldoLiquido > 0 ? 'Positivo' : saldoLiquido < 0 ? 'Negativo' : 'Neutro'}
                />
              </div>

              {/* Gráficos de Distribuição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <BranchDistributionChart
                  data={branchDistributionDataFromTransactions}
                  dateRange={filtrosGlobais.intervalo}
                  insight="Distribuição de comissões realizadas por ramo no período selecionado."
                />

                <CompanyDistributionChart
                  data={companyDistributionDataFromTransactions}
                  dateRange={filtrosGlobais.intervalo}
                  insight="Distribuição de comissões realizadas por seguradora no período selecionado."
                />
              </div>
            </div>

            <RelatorioFaturamento apolices={apolicesFiltradas} clientes={clientesFiltrados} transactions={transacoesFiltradas} intervalo={filtrosGlobais.intervalo} />

            {/* Insights Financeiros */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AdimplenciaDonut apolices={apolicesFiltradas} transacoes={transacoesFiltradas} />
              <DreCompactoBar apolices={apolicesFiltradas} transacoes={transacoesFiltradas} totalGanhos={totalGanhos} totalPerdas={totalPerdas} />
              <AlertaAtrasoFinanceiro apolices={apolicesFiltradas} transacoes={transacoesFiltradas} />
            </div>

            {/* Análises Avançadas - Carousel */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Análises Avançadas e Detalhadas</h3>
              <Carousel className="w-full" opts={{ align: 'start', loop: true }}>
                <CarouselContent>
                  <CarouselItem>
                    <EnhancedGrowthChart data={dadosEvolucaoCarteira.data} dateRange={filtrosGlobais.intervalo} insight={dadosEvolucaoCarteira.insight} />
                  </CarouselItem>
                  <CarouselItem>
                    <EnhancedProducerPerformanceChart data={dadosPerformanceProdutor.data} insight={dadosPerformanceProdutor.insight} />
                  </CarouselItem>
                  <CarouselItem>
                    <EnhancedExpirationCalendarChart data={dadosVencimentosCriticos.data} insight={dadosVencimentosCriticos.insight} />
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
            <PlaceholderGraficos />
          </>
        )}
      </div>

      {isFilterActive && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <PreviewCard
            title="Clientes Encontrados"
            data={clientesPreview}
            linkTo="/dashboard/clients"
            filters={previewFilters}
            extraParams={{
              start: filtrosGlobais.intervalo?.from ? filtrosGlobais.intervalo.from.toISOString().split('T')[0] : '',
              end: filtrosGlobais.intervalo?.to ? filtrosGlobais.intervalo.to.toISOString().split('T')[0] : '',
            }}
          />
          <PreviewCard
            title="Apólices Encontradas"
            data={apolicesPreview}
            linkTo="/dashboard/policies"
            filters={previewFilters}
            extraParams={{
              start: filtrosGlobais.intervalo?.from ? filtrosGlobais.intervalo.from.toISOString().split('T')[0] : '',
              end: filtrosGlobais.intervalo?.to ? filtrosGlobais.intervalo.to.toISOString().split('T')[0] : '',
            }}
          />
        </div>
      )}
    </div>
  );
}
