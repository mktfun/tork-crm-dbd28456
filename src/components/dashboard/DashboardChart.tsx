
import { AppCard } from '@/components/ui/app-card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useState, useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseTransactionTypes } from '@/hooks/useSupabaseTransactionTypes';
import { Loader2 } from 'lucide-react';
import { getCurrentMonthRange } from '@/utils/dateUtils';
import {
  BarChart as BarChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';

export function DashboardChart() {
  // Estado completo do gráfico
  const [opcoesGrafico, setOpcoesGrafico] = useState({
    intervalo: getCurrentMonthRange() as DateRange,
    series: ['GANHO', 'PERDA'] as string[],
    tipoGrafico: 'bar' as 'bar' | 'line',
  });

  // 🎯 CONECTANDO AOS DADOS REAIS DO SUPABASE
  const { transactions, loading: transactionsLoading } = useSupabaseTransactions();
  const { transactionTypes, loading: typesLoading } = useSupabaseTransactionTypes();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    });
  };

  // Debug do estado
  console.log('Estado do gráfico:', opcoesGrafico);
  console.log('🔍 Transações no Supabase:', transactions.length);
  console.log('🔍 Tipos de transação no Supabase:', transactionTypes.length);

  // 🚀 LÓGICA COM GRANULARIDADE INTELIGENTE
  const dadosParaGrafico = useMemo(() => {
    console.log('💰 Recalculando dados do gráfico...');

    // 1. Filtra as transações pelo intervalo de data selecionado
    const transacoesFiltradas = transactions.filter(t => {
      const dataTransacao = new Date(t.date);
      return opcoesGrafico.intervalo?.from && opcoesGrafico.intervalo?.to
        ? dataTransacao >= opcoesGrafico.intervalo.from && dataTransacao <= opcoesGrafico.intervalo.to
        : true;
    });

    console.log(`📊 Transações filtradas por período: ${transacoesFiltradas.length}`);

    // 2. DETERMINAR GRANULARIDADE BASEADA NO PERÍODO
    let granularidade: 'dia' | 'mes' = 'mes';
    let formatoChave: string = 'yyyy-MM';
    let formatoNome: string = 'MMM/yy';

    if (opcoesGrafico.intervalo?.from && opcoesGrafico.intervalo?.to) {
      const diasDiferenca = differenceInDays(opcoesGrafico.intervalo.to, opcoesGrafico.intervalo.from);

      // Se o período for <= 60 dias, mostrar por dia
      if (diasDiferenca <= 60) {
        granularidade = 'dia';
        formatoChave = 'yyyy-MM-dd';
        formatoNome = 'dd/MM';
      }
    }

    console.log(`📅 Granularidade escolhida: ${granularidade}`);

    // 3. Agrupa os dados pela granularidade escolhida
    const dadosAgrupados = transacoesFiltradas.reduce((acc, t) => {
      const chave = format(new Date(t.date), formatoChave);
      const nomeAmigavel = format(new Date(t.date), formatoNome);

      if (!acc[chave]) {
        acc[chave] = { nome: nomeAmigavel, GANHO: 0, PERDA: 0 };
      }

      // Busca o tipo da transação para determinar se é GANHO ou PERDA
      const tipo = transactionTypes.find(tt => tt.id === t.typeId);
      if (tipo?.nature === 'GANHO') {
        acc[chave].GANHO += Number(t.amount);
      } else if (tipo?.nature === 'PERDA') {
        acc[chave].PERDA += Number(t.amount);
      }

      return acc;
    }, {} as Record<string, { nome: string; GANHO: number; PERDA: number }>);

    // 4. Converte o objeto em um array e ordena
    const resultado = Object.entries(dadosAgrupados)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, dados]) => dados);

    console.log('📈 Dados finais do gráfico:', resultado);
    return resultado;

  }, [transactions, transactionTypes, opcoesGrafico.intervalo]);

  const isLoading = transactionsLoading || typesLoading;

  return (
    <AppCard className="lg:col-span-2 p-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">Análise de Performance</h3>

      {/* A NOVA BARRA DE FERRAMENTAS COMPLETA */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 rounded-lg border border-slate-800 bg-slate-900">

        {/* FILTRO DE PERÍODO */}
        <DatePickerWithRange
          date={opcoesGrafico.intervalo}
          onDateChange={(intervalo) => setOpcoesGrafico(prev => ({ ...prev, intervalo: intervalo || prev.intervalo }))}
        />

        <div className="flex items-center gap-2">
          {/* SELETOR DE SÉRIES (GANHO/PERDA) */}
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={opcoesGrafico.series}
            onValueChange={(series) => series.length > 0 && setOpcoesGrafico(prev => ({ ...prev, series }))}
            className="[&>button]:rounded-md [&>button]:border-slate-700"
          >
            <ToggleGroupItem value="GANHO" className="text-green-400">Ganhos</ToggleGroupItem>
            <ToggleGroupItem value="PERDA" className="text-red-400">Perdas</ToggleGroupItem>
          </ToggleGroup>

          {/* SELETOR DE TIPO DE GRÁFICO (LINHA/BARRA) */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={opcoesGrafico.tipoGrafico}
            onValueChange={(tipo) => tipo && setOpcoesGrafico(prev => ({ ...prev, tipoGrafico: tipo as 'bar' | 'line' }))}
            className="[&>button]:rounded-md [&>button]:border-slate-700"
          >
            <ToggleGroupItem value="bar"><BarChartIcon className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="line"><LineChartIcon className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-2 text-slate-300">Carregando dados do gráfico...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {opcoesGrafico.tipoGrafico === 'bar' ? (
              <BarChart data={dadosParaGrafico}>
                <defs>
                  {/* Criando um gradiente para as barras, porque a gente é chique */}
                  <linearGradient id="colorGanho" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorPerda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis
                  dataKey="nome"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${Math.abs(value) / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent) / 0.3)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background) / 0.9)',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(Math.abs(value)),
                    name === 'GANHO' ? 'Ganhos' : 'Perdas'
                  ]}
                />

                {/* Renderiza as barras com as cores e gradientes que definimos */}
                {opcoesGrafico.series.includes('GANHO') &&
                  <Bar dataKey="GANHO" fill="url(#colorGanho)" radius={[4, 4, 0, 0]} />
                }
                {opcoesGrafico.series.includes('PERDA') &&
                  <Bar dataKey="PERDA" fill="url(#colorPerda)" radius={[4, 4, 0, 0]} />
                }
              </BarChart>
            ) : (
              <LineChart data={dadosParaGrafico}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis
                  dataKey="nome"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${Math.abs(value) / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background) / 0.9)',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(Math.abs(value)),
                    name === 'GANHO' ? 'Ganhos' : 'Perdas'
                  ]}
                />

                {opcoesGrafico.series.includes('GANHO') &&
                  <Line
                    type="monotone"
                    dataKey="GANHO"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                  />
                }
                {opcoesGrafico.series.includes('PERDA') &&
                  <Line
                    type="monotone"
                    dataKey="PERDA"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                  />
                }
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </AppCard>
  );
}
