
import { AppCard } from '@/components/ui/app-card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useState, useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, LineChart } from 'recharts';
import { startOfMonth, endOfMonth, format, differenceInDays, subDays, startOfDay, endOfDay, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabasePolicies } from '@/hooks/useSupabasePolicies';
import { Loader2, TrendingUp, BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { ChartInsight } from './charts/ChartInsight';

export function PerformanceChart() {
  // Estados para controlar os filtros - ✅ INICIANDO COM MÊS ATUAL
  const [opcoesGrafico, setOpcoesGrafico] = useState({
    intervalo: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange,
    series: ['comissao', 'novasApolices'] as string[],
    tipoGrafico: 'composed' as 'bar' | 'line' | 'composed',
  });

  // Hooks para dados reais do Supabase
  const { transactions, loading: transactionsLoading } = useSupabaseTransactions();
  const { policies, loading: policiesLoading } = useSupabasePolicies();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    });
  };

  // Lógica principal com granularidade inteligente
  const dadosParaGrafico = useMemo(() => {

    if (!opcoesGrafico.intervalo?.from || !opcoesGrafico.intervalo?.to) {
      return [];
    }

    // 1. DETERMINAR GRANULARIDADE BASEADA NO PERÍODO
    const diasDiferenca = differenceInDays(opcoesGrafico.intervalo.to, opcoesGrafico.intervalo.from);
    let granularidade: 'dia' | 'mes' = 'mes';
    let formatoChave: string = 'yyyy-MM';
    let formatoNome: string = 'MMM/yy';

    if (diasDiferenca <= 60) {
      granularidade = 'dia';
      formatoChave = 'yyyy-MM-dd';
      formatoNome = 'dd/MM';
    }

    // 2. FILTRAR TRANSAÇÕES POR PERÍODO — usa sempre a data da transação (t.date)
    // CORREÇÃO: anteriormente usava apolice.startDate, que causava quase todas as transações
    // serem excluídas do mês atual (apólice criada em meses anteriores).
    const dataInicio = startOfDay(
      typeof opcoesGrafico.intervalo.from === 'string'
        ? parse(opcoesGrafico.intervalo.from, 'yyyy-MM-dd', new Date())
        : opcoesGrafico.intervalo.from!
    );
    const dataFim = endOfDay(
      typeof opcoesGrafico.intervalo.to === 'string'
        ? parse(opcoesGrafico.intervalo.to, 'yyyy-MM-dd', new Date())
        : opcoesGrafico.intervalo.to!
    );

    const transacoesFiltradas = transactions.filter(t => {
      if (!t.date || t.nature !== 'RECEITA') return false;
      const dataTransacao = startOfDay(new Date(t.date));
      return dataTransacao >= dataInicio && dataTransacao <= dataFim;
    });

    // 3. FILTRAR APÓLICES POR PERÍODO — usa start_date OU created_at como referência
    const apolicesFiltradas = policies.filter(p => {
      const refDate = p.startDate ? new Date(p.startDate) : null;
      if (!refDate) return false;
      const dataApolice = startOfDay(refDate);
      return dataApolice >= dataInicio &&
        dataApolice <= dataFim &&
        p.status !== 'Orçamento';
    });

    // 4. PROCESSAR DADOS POR GRANULARIDADE
    const dadosAgrupados = new Map<string, { nome: string; comissao: number; novasApolices: number }>();

    // Processar comissões — SEMPRE usa a data da transação para agrupamento
    transacoesFiltradas.forEach(t => {
      if (t.nature !== 'RECEITA') return;

      const chave = format(new Date(t.date), formatoChave);
      const nomeAmigavel = format(new Date(t.date), formatoNome);

      if (!dadosAgrupados.has(chave)) {
        dadosAgrupados.set(chave, { nome: nomeAmigavel, comissao: 0, novasApolices: 0 });
      }

      dadosAgrupados.get(chave)!.comissao += Number(t.amount);
    });

    // Processar novas apólices - ✅ USANDO start_date (DATA DE VIGÊNCIA)
    apolicesFiltradas.forEach(p => {
      if (!p.startDate) return; // Proteção contra dado nulo
      const chave = format(new Date(p.startDate), formatoChave);
      const nomeAmigavel = format(new Date(p.startDate), formatoNome);

      if (!dadosAgrupados.has(chave)) {
        dadosAgrupados.set(chave, { nome: nomeAmigavel, comissao: 0, novasApolices: 0 });
      }

      dadosAgrupados.get(chave)!.novasApolices += 1;
    });

    // 5. Converter para array e ordenar
    const resultado = Array.from(dadosAgrupados.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, dados]) => dados);

    return resultado;

  }, [transactions, policies, opcoesGrafico.intervalo]);

  // Calcular insight dinâmico
  const insightPerformance = () => {
    if (dadosParaGrafico.length === 0) return 'Carregando análise de performance...';

    const ultimosPeriodos = dadosParaGrafico.slice(-2);
    if (ultimosPeriodos.length < 2) return 'Dados insuficientes para análise comparativa.';

    const [penultimo, ultimo] = ultimosPeriodos;
    const crescimentoComissao = penultimo.comissao > 0
      ? ((ultimo.comissao - penultimo.comissao) / penultimo.comissao) * 100
      : 0;
    const crescimentoApolices = ultimo.novasApolices - penultimo.novasApolices;

    if (crescimentoComissao > 0 && crescimentoApolices > 0) {
      return `Excelente! Crescimento de ${crescimentoComissao.toFixed(1)}% na comissão e +${crescimentoApolices} apólices no último período.`;
    } else if (crescimentoComissao > 0) {
      return `Comissão cresceu ${crescimentoComissao.toFixed(1)}%, mas volume de apólices caiu. Foque na aquisição!`;
    } else if (crescimentoApolices > 0) {
      return `Mais ${crescimentoApolices} apólices no último período! Agora otimize as comissões por cliente.`;
    } else {
      return `Performance em queda. Revise estratégias de aquisição e retenção de clientes.`;
    }
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.dataKey === 'comissao' ? 'Comissão' : 'Novas Apólices'}:
              </span> {entry.dataKey === 'comissao'
                ? formatCurrency(entry.value)
                : `${entry.value} apólices`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const isLoading = transactionsLoading || policiesLoading;

  if (isLoading) {
    return (
      <AppCard className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4 w-3/4"></div>
          <div className="h-80 bg-muted rounded"></div>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Performance Financeira vs. Crescimento de Clientes
      </h3>

      {/* BARRA DE CONTROLES MODERNIZADA */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 rounded-lg border border-border bg-card">

        {/* FILTRO DE PERÍODO */}
        <DatePickerWithRange
          date={opcoesGrafico.intervalo}
          onDateChange={(intervalo) => setOpcoesGrafico(prev => ({ ...prev, intervalo: intervalo || prev.intervalo }))}
        />

        <div className="flex items-center gap-2">
          {/* SELETOR DE SÉRIES (COMISSÃO/APÓLICES) */}
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={opcoesGrafico.series}
            onValueChange={(series) => series.length > 0 && setOpcoesGrafico(prev => ({ ...prev, series }))}
            className="[&>button]:rounded-md [&>button]:border-border"
          >
            <ToggleGroupItem value="comissao" className="text-blue-400">Comissão</ToggleGroupItem>
            <ToggleGroupItem value="novasApolices" className="text-green-400">Apólices</ToggleGroupItem>
          </ToggleGroup>

          {/* SELETOR DE TIPO DE GRÁFICO */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={opcoesGrafico.tipoGrafico}
            onValueChange={(tipo) => tipo && setOpcoesGrafico(prev => ({ ...prev, tipoGrafico: tipo as 'bar' | 'line' | 'composed' }))}
            className="[&>button]:rounded-md [&>button]:border-border"
          >
            <ToggleGroupItem value="bar"><BarChartIcon className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="line"><LineChartIcon className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="composed"><TrendingUp className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="h-80">
        {dadosParaGrafico.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground text-lg mb-2">📊 Nenhum dado encontrado</p>
              <p className="text-muted-foreground text-sm">Ajuste o período ou verifique se há transações/apólices no intervalo selecionado</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {opcoesGrafico.tipoGrafico === 'composed' ? (
              <ComposedChart data={dadosParaGrafico} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip content={<CustomTooltip />} />
                {opcoesGrafico.series.includes('comissao') && (
                  <Bar
                    yAxisId="left"
                    dataKey="comissao"
                    fill="#3b82f6"
                    name="Comissão (R$)"
                    radius={[2, 2, 0, 0]}
                  />
                )}
                {opcoesGrafico.series.includes('novasApolices') && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="novasApolices"
                    stroke="#10b981"
                    name="Novas Apólices"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            ) : opcoesGrafico.tipoGrafico === 'bar' ? (
              <BarChart data={dadosParaGrafico} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(value) => `${Math.abs(value) / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                {opcoesGrafico.series.includes('comissao') && (
                  <Bar dataKey="comissao" fill="#3b82f6" name="Comissão" radius={[2, 2, 0, 0]} />
                )}
                {opcoesGrafico.series.includes('novasApolices') && (
                  <Bar dataKey="novasApolices" fill="#10b981" name="Novas Apólices" radius={[2, 2, 0, 0]} />
                )}
              </BarChart>
            ) : (
              <LineChart data={dadosParaGrafico} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(value) => `${Math.abs(value) / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                {opcoesGrafico.series.includes('comissao') && (
                  <Line
                    type="monotone"
                    dataKey="comissao"
                    stroke="#3b82f6"
                    name="Comissão"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                )}
                {opcoesGrafico.series.includes('novasApolices') && (
                  <Line
                    type="monotone"
                    dataKey="novasApolices"
                    stroke="#10b981"
                    name="Novas Apólices"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <ChartInsight icon={TrendingUp} text={insightPerformance()} />
    </AppCard>
  );
}
