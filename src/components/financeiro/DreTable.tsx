import { useMemo, useState } from 'react';
import { FileSpreadsheet, TrendingUp, TrendingDown, Calculator, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppCard } from '@/components/ui/app-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useDreData } from '@/hooks/useFinanceiro';
import { DreRow, DreSummary } from '@/types/financeiro';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function YearSelector({ value, onChange }: { value: number; onChange: (year: number) => void }) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DreTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function EmptyDreState() {
  return (
    <div className="text-center py-16">
      <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
      <h3 className="text-lg font-medium mb-2">Nenhum dado disponível</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        Ainda não há lançamentos registrados para este período.
        Comece registrando despesas ou marcando comissões como pagas.
      </p>
    </div>
  );
}

interface DreTableProps {
  className?: string;
}

export function DreTable({ className }: DreTableProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compactMode, setCompactMode] = useState(false);
  const { data: rows = [], isLoading } = useDreData(selectedYear);

  const currentMonthIndex = new Date().getFullYear() === selectedYear ? new Date().getMonth() : -1;

  // Separar receitas e despesas
  const { revenueRows, expenseRows, summary } = useMemo(() => {
    const revenueRows = rows.filter(r => r.account_type === 'revenue');
    const expenseRows = rows.filter(r => r.account_type === 'expense');

    // Calcular totais por mês
    const sumByMonth = (items: DreRow[], month: typeof MONTHS[number]) =>
      items.reduce((acc, row) => acc + row[month], 0);

    const totalRevenue = revenueRows.reduce((acc, row) => acc + row.total, 0);
    const totalExpense = expenseRows.reduce((acc, row) => acc + row.total, 0);

    // Calcular YTD (Year To Date)
    // Assumindo YTD até o mês atual se ano corrente, senão ano todo
    const targetMonthIdx = currentMonthIndex >= 0 ? currentMonthIndex : 11;
    const calculateYTD = (row: DreRow) => {
      let sum = 0;
      for (let i = 0; i <= targetMonthIdx; i++) {
        sum += row[MONTHS[i]];
      }
      return sum;
    };

    const enhanceRows = (rs: DreRow[]) => rs.map(r => ({ ...r, ytd: calculateYTD(r) }));
    const enhancedRevenueRows = enhanceRows(revenueRows);
    const enhancedExpenseRows = enhanceRows(expenseRows);

    // Summary YTD
    const summaryYTD: Record<'revenue' | 'expense' | 'net', number> = { revenue: 0, expense: 0, net: 0 };
    for (let i = 0; i <= targetMonthIdx; i++) {
      summaryYTD.revenue += sumByMonth(revenueRows, MONTHS[i]);
      summaryYTD.expense += sumByMonth(expenseRows, MONTHS[i]);
    }
    summaryYTD.net = summaryYTD.revenue - summaryYTD.expense;

    const summary: DreSummary & { byMonth: Record<string, { revenue: number; expense: number; net: number }>, ytd: typeof summaryYTD } = {
      totalRevenue,
      totalExpense,
      netResult: totalRevenue - totalExpense,
      byMonth: MONTHS.reduce((acc, month) => {
        const rev = sumByMonth(revenueRows, month);
        const exp = sumByMonth(expenseRows, month);
        acc[month] = { revenue: rev, expense: exp, net: rev - exp };
        return acc;
      }, {} as Record<string, { revenue: number; expense: number; net: number }>),
      ytd: summaryYTD
    };

    return { revenueRows: enhancedRevenueRows, expenseRows: enhancedExpenseRows, summary };
  }, [rows, currentMonthIndex, selectedYear]);

  if (isLoading) {
    return <DreTableSkeleton />;
  }

  const hasData = rows.length > 0;
  const paddingClass = compactMode ? "py-1 px-2" : "py-3 px-4";
  const stickyColClass = "sticky left-0 z-20 bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  const stickyHeaderClass = "sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border shadow-sm";

  return (
    <TooltipProvider delayDuration={300}>
      <AppCard className={className}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 px-4 sticky left-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 hidden sm:block">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Demonstrativo de Resultado (DRE)</CardTitle>
              <CardDescription>Análise detalhada de receitas e despesas</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center space-x-2">
              <Switch id="compact-mode" checked={compactMode} onCheckedChange={setCompactMode} />
              <Label htmlFor="compact-mode" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                {compactMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                {compactMode ? "Compacto" : "Expandido"}
              </Label>
            </div>
            <YearSelector value={selectedYear} onChange={setSelectedYear} />
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {!hasData ? (
            <EmptyDreState />
          ) : (
            <div className="overflow-auto max-h-[70vh] relative">
              <Table>
                <TableHeader className={stickyHeaderClass}>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className={`${stickyColClass} min-w-[200px] font-bold pl-6 text-primary bg-card`}>Categoria</TableHead>
                    <TableHead className="text-right min-w-[100px] font-semibold bg-primary/5 mx-0.5 border-r border-border/50">YTD</TableHead>
                    {MONTH_LABELS.map((label, i) => (
                      <TableHead key={i} className={`text-right min-w-[100px] font-medium ${i === currentMonthIndex ? 'bg-primary/10 text-primary font-bold border-x border-primary/20' : ''}`}>
                        {label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[120px] font-bold pr-6">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* SEÇÃO DE RECEITAS */}
                  <TableRow className="bg-emerald-500/15 hover:bg-emerald-500/20 border-border">
                    <TableCell colSpan={15} className={`font-bold text-emerald-600 dark:text-emerald-400 pl-6 ${paddingClass} ${stickyColClass} bg-card`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        (+) RECEITAS
                      </div>
                    </TableCell>
                  </TableRow>
                  {revenueRows.map((row, idx) => (
                    <TableRow key={`rev-${idx}`} className={`hover:bg-muted/50 border-border transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                      <TableCell className={`${paddingClass} pl-6 text-muted-foreground font-medium ${stickyColClass} transition-colors ${idx % 2 === 0 ? 'bg-card' : 'bg-card/50'}`}>
                        <div className="truncate max-w-[180px]" title={row.category}>{row.category}</div>
                      </TableCell>
                      <TableCell className={`${paddingClass} text-right tabular-nums bg-primary/5 font-medium border-r border-border/50`}>
                        {formatCurrency(row.ytd || 0, true)}
                      </TableCell>
                      {MONTHS.map((month, mIdx) => (
                        <TableCell key={month} className={`${paddingClass} text-right tabular-nums ${mIdx === currentMonthIndex ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                          {row[month] > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help decoration-dotted underline decoration-primary/30 underline-offset-2">
                                  {formatCurrency(row[month], true)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">
                                  {((row[month] / summary.byMonth[month].revenue) * 100).toFixed(1)}% do mês
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/30 ml-2">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={`${paddingClass} text-right font-bold bg-muted/30 tabular-nums pr-6`}>
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Receitas */}
                  <TableRow className="bg-emerald-500/15 border-t-2 border-emerald-500/20 hover:bg-emerald-500/20 sticky bottom-0 z-10 shadow-sm font-medium">
                    <TableCell className={`${paddingClass} font-bold text-emerald-700 dark:text-emerald-300 pl-6 ${stickyColClass} bg-card`}>
                      = Total Receitas
                    </TableCell>
                    <TableCell className={`${paddingClass} text-right text-emerald-700 dark:text-emerald-300 tabular-nums bg-emerald-500/15 border-r border-emerald-500/30`}>
                      {formatCurrency(summary.ytd.revenue, true)}
                    </TableCell>
                    {MONTHS.map((month, mIdx) => (
                      <TableCell key={month} className={`${paddingClass} text-right text-emerald-700 dark:text-emerald-300 tabular-nums ${mIdx === currentMonthIndex ? 'bg-emerald-500/20 border-x border-emerald-500/30 font-bold' : ''}`}>
                        {summary.byMonth[month].revenue > 0 ? formatCurrency(summary.byMonth[month].revenue, true) : '-'}
                      </TableCell>
                    ))}
                    <TableCell className={`${paddingClass} text-right font-bold text-emerald-700 dark:text-emerald-300 tabular-nums pr-6`}>
                      {formatCurrency(summary.totalRevenue)}
                    </TableCell>
                  </TableRow>

                  {/* Espaçador */}
                  <TableRow className="h-6 hover:bg-transparent border-none">
                    <TableCell colSpan={15} className="bg-muted/5"></TableCell>
                  </TableRow>

                  {/* SEÇÃO DE DESPESAS */}
                  <TableRow className="bg-rose-500/15 hover:bg-rose-500/20 border-border">
                    <TableCell colSpan={15} className={`font-bold text-rose-600 dark:text-rose-400 pl-6 ${paddingClass} ${stickyColClass} bg-card`}>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        (-) DESPESAS
                      </div>
                    </TableCell>
                  </TableRow>
                  {expenseRows.map((row, idx) => (
                    <TableRow key={`exp-${idx}`} className={`hover:bg-muted/50 border-border transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                      <TableCell className={`${paddingClass} pl-6 text-muted-foreground font-medium ${stickyColClass} transition-colors ${idx % 2 === 0 ? 'bg-card' : 'bg-card/50'}`}>
                        <div className="truncate max-w-[180px]" title={row.category}>{row.category}</div>
                      </TableCell>
                      <TableCell className={`${paddingClass} text-right tabular-nums bg-primary/5 font-medium border-r border-border/50`}>
                        {formatCurrency(row.ytd || 0, true)}
                      </TableCell>
                      {MONTHS.map((month, mIdx) => (
                        <TableCell key={month} className={`${paddingClass} text-right tabular-nums ${mIdx === currentMonthIndex ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                          {row[month] > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help decoration-dotted underline decoration-destructive/30 underline-offset-2">
                                  {formatCurrency(row[month], true)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">
                                  {((row[month] / summary.byMonth[month].expense) * 100).toFixed(1)}% do mês
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/30 ml-2">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={`${paddingClass} text-right font-medium bg-muted/30 tabular-nums pr-6`}>
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Despesas */}
                  <TableRow className="bg-rose-500/15 border-t-2 border-rose-500/20 hover:bg-rose-500/20 font-medium">
                    <TableCell className={`${paddingClass} font-bold text-rose-700 dark:text-rose-300 pl-6 ${stickyColClass} bg-card`}>
                      = Total Despesas
                    </TableCell>
                    <TableCell className={`${paddingClass} text-right text-rose-700 dark:text-rose-300 tabular-nums bg-rose-500/15 border-r border-rose-500/30`}>
                      {formatCurrency(summary.ytd.expense, true)}
                    </TableCell>
                    {MONTHS.map((month, mIdx) => (
                      <TableCell key={month} className={`${paddingClass} text-right text-rose-700 dark:text-rose-300 tabular-nums ${mIdx === currentMonthIndex ? 'bg-rose-500/20 border-x border-rose-500/30 font-bold' : ''}`}>
                        {summary.byMonth[month].expense > 0 ? formatCurrency(summary.byMonth[month].expense, true) : '-'}
                      </TableCell>
                    ))}
                    <TableCell className={`${paddingClass} text-right font-bold text-rose-700 dark:text-rose-300 tabular-nums pr-6`}>
                      {formatCurrency(summary.totalExpense)}
                    </TableCell>
                  </TableRow>

                  {/* Espaçador */}
                  <TableRow className="h-6 hover:bg-transparent border-none">
                    <TableCell colSpan={15} className="bg-muted/5"></TableCell>
                  </TableRow>

                  {/* RESULTADO LÍQUIDO */}
                  <TableRow className={`border-t-4 shadow-md ${summary.netResult >= 0 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'}`}>
                    <TableCell className={`${paddingClass} font-black text-lg pl-6 ${stickyColClass} ${summary.netResult >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'} bg-card`}>
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        RESULTADO
                        <Badge variant={summary.netResult >= 0 ? 'default' : 'destructive'} className="ml-2 hidden lg:inline-flex">
                          {summary.netResult >= 0 ? 'Lucro' : 'Prejuízo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={`${paddingClass} text-right font-bold tabular-nums border-r border-border/20 ${summary.ytd.net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {formatCurrency(summary.ytd.net, true)}
                    </TableCell>
                    {MONTHS.map((month, mIdx) => {
                      const net = summary.byMonth[month].net;
                      return (
                        <TableCell
                          key={month}
                          className={`${paddingClass} text-right font-bold tabular-nums ${net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'} ${mIdx === currentMonthIndex ? 'bg-background/20 backdrop-brightness-110 border-x border-border/20 scale-105 origin-center shadow-inner' : ''}`}
                        >
                          {net !== 0 ? formatCurrency(net, true) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      className={`${paddingClass} text-right font-black text-lg tabular-nums pr-6 ${summary.netResult >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}
                    >
                      {formatCurrency(summary.netResult)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </AppCard>
    </TooltipProvider>
  );
}
