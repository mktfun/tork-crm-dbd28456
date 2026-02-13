import { useMemo, useState, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

import { AppCard } from '@/components/ui/app-card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectedCashFlowPoint } from '@/types/recurring';

interface ProjectedCashFlowChartProps {
  data: ProjectedCashFlowPoint[];
  isLoading: boolean;
  granularity?: 'day' | 'week' | 'month';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg min-w-[220px]">
      <p className="text-sm font-medium text-foreground mb-3 border-b pb-2">
        {data?.period || label}
      </p>
      <div className="space-y-2">
        {/* Realizado */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Realizado</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-500">Receitas</span>
            <span className="text-xs font-medium">{formatCurrency(data?.realized_income || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-500">Despesas</span>
            <span className="text-xs font-medium">{formatCurrency(data?.realized_expense || 0)}</span>
          </div>
        </div>
        {/* Projetado */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs text-muted-foreground font-medium">Projetado</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400">Receitas</span>
            <span className="text-xs font-medium">{formatCurrency(data?.projected_income || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400">Despesas</span>
            <span className="text-xs font-medium">{formatCurrency(data?.projected_expense || 0)}</span>
          </div>
        </div>
        {/* Saldo */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary font-medium">Saldo Projetado</span>
            <span className={`text-sm font-bold ${(data?.running_balance || 0) < 0 ? 'text-rose-500' : 'text-primary'}`}>
              {formatCurrency(data?.running_balance || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CONSTANTS ==========
const MIN_VIEWPORT = 7;
const MAX_VIEWPORT = 90;
const INITIAL_VIEWPORT = 30;

console.log('[ANTIGRAVITY] ProjectedCashFlowChart MAPS-LIKE v2 LOADED');

export function ProjectedCashFlowChart({
  data,
  isLoading,
  granularity = 'day'
}: ProjectedCashFlowChartProps) {
  // ========== DATA ==========
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      totalIncome: point.realized_income + point.projected_income,
      totalExpense: point.realized_expense + point.projected_expense,
    }));
  }, [data]);

  const totalPoints = chartData.length;
  const hasData = totalPoints > 0;

  // ========== VIEWPORT STATE (Maps-like) ==========
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(Math.min(INITIAL_VIEWPORT, totalPoints));

  // Sync viewport when data changes
  useMemo(() => {
    if (totalPoints > 0) {
      setViewStart(0);
      setViewEnd(Math.min(INITIAL_VIEWPORT, totalPoints));
    }
  }, [totalPoints]);

  // Clamp helpers
  const clampViewport = useCallback((start: number, end: number) => {
    let s = Math.round(start);
    let e = Math.round(end);
    const span = e - s;

    // Enforce min/max span
    if (span < MIN_VIEWPORT) {
      const mid = (s + e) / 2;
      s = Math.round(mid - MIN_VIEWPORT / 2);
      e = s + MIN_VIEWPORT;
    }
    if (span > MAX_VIEWPORT) {
      const mid = (s + e) / 2;
      s = Math.round(mid - MAX_VIEWPORT / 2);
      e = s + MAX_VIEWPORT;
    }

    // Enforce bounds
    if (s < 0) { e -= s; s = 0; }
    if (e > totalPoints) { s -= (e - totalPoints); e = totalPoints; }
    if (s < 0) s = 0;

    return { s, e };
  }, [totalPoints]);

  // ========== DRAG (Panning) ==========
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartView.current = { start: viewStart, end: viewEnd };
    e.preventDefault();
  }, [viewStart, viewEnd]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const dx = e.clientX - dragStartX.current;
    const viewportSpan = dragStartView.current.end - dragStartView.current.start;
    const pointsPerPixel = viewportSpan / containerWidth;
    const deltaPoints = -dx * pointsPerPixel;

    const newStart = dragStartView.current.start + deltaPoints;
    const newEnd = dragStartView.current.end + deltaPoints;
    const { s, e: end } = clampViewport(newStart, newEnd);
    setViewStart(s);
    setViewEnd(end);
  }, [clampViewport]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ========== ZOOM (Wheel) ==========
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentSpan = viewEnd - viewStart;
    const zoomFactor = e.deltaY < 0 ? -0.1 : 0.1; // negative = zoom in
    const delta = currentSpan * zoomFactor;

    const mid = (viewStart + viewEnd) / 2;
    const newSpan = currentSpan + delta * 2;
    const newStart = mid - newSpan / 2;
    const newEnd = mid + newSpan / 2;

    const { s, e: end } = clampViewport(newStart, newEnd);
    setViewStart(s);
    setViewEnd(end);
  }, [viewStart, viewEnd, clampViewport]);

  // ========== SLICED DATA ==========
  const visibleData = useMemo(() => {
    return chartData.slice(viewStart, viewEnd);
  }, [chartData, viewStart, viewEnd]);

  // ========== ANALYSIS ==========
  const analysis = useMemo(() => {
    if (!hasData) return null;

    const minBalance = Math.min(...chartData.map(p => p.running_balance));
    const maxBalance = Math.max(...chartData.map(p => p.running_balance));
    const finalBalance = chartData[chartData.length - 1]?.running_balance || 0;
    const hasDeficit = minBalance < 0;
    const deficitPeriod = hasDeficit
      ? chartData.find(p => p.running_balance < 0)?.period
      : null;

    const totalProjectedIncome = chartData.reduce((sum, p) => sum + p.projected_income, 0);
    const totalProjectedExpense = chartData.reduce((sum, p) => sum + p.projected_expense, 0);

    return {
      minBalance,
      maxBalance,
      finalBalance,
      hasDeficit,
      deficitPeriod,
      totalProjectedIncome,
      totalProjectedExpense,
    };
  }, [chartData, hasData]);

  // ========== MINIMAP ==========
  const minimapRatio = useMemo(() => {
    if (totalPoints === 0) return { left: 0, width: 100 };
    return {
      left: (viewStart / totalPoints) * 100,
      width: ((viewEnd - viewStart) / totalPoints) * 100,
    };
  }, [viewStart, viewEnd, totalPoints]);

  // ========== RENDER ==========

  if (isLoading) {
    return (
      <AppCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Projeção de Tesouraria
          </CardTitle>
          <CardDescription>Ponte de Caixa com Recorrências</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Projeção de Tesouraria
            </CardTitle>
            <CardDescription>
              Ponte de caixa com receitas pendentes e despesas recorrentes
            </CardDescription>
          </div>
          {hasData && analysis && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Projetado:</span>
                <span className="text-sm font-semibold text-emerald-500">
                  {formatCurrency(analysis.totalProjectedIncome)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <span className="text-xs text-muted-foreground">Projetado:</span>
                <span className="text-sm font-semibold text-rose-500">
                  {formatCurrency(analysis.totalProjectedExpense)}
                </span>
              </div>
              <Badge
                variant={analysis.finalBalance >= 0 ? 'default' : 'destructive'}
                className="gap-1"
              >
                <Wallet className="w-3 h-3" />
                Saldo Final: {formatCurrency(analysis.finalBalance)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Alerta de Déficit */}
        {analysis?.hasDeficit && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Projeção de Déficit</AlertTitle>
            <AlertDescription>
              Saldo projetado ficará negativo em <strong>{analysis.deficitPeriod}</strong>.
              Considere antecipar recebimentos ou postergar pagamentos.
            </AlertDescription>
          </Alert>
        )}

        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <Wallet className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum dado disponível para o período.</p>
            <p className="text-sm">Configure receitas pendentes ou despesas recorrentes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart Container with drag/zoom */}
            <div
              ref={containerRef}
              className="w-full select-none"
              style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div style={{ height: 400, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={visibleData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />

                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      interval={granularity === 'day' ? 'preserveStartEnd' : 0}
                      minTickGap={30}
                    />

                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatCurrency(value)}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      width={90}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />

                    <Legend
                      wrapperStyle={{ paddingTop: 20 }}
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground font-medium">{value}</span>
                      )}
                    />

                    <ReferenceLine
                      y={0}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                    />

                    <Bar
                      dataKey="totalIncome"
                      name="Receitas"
                      fill="hsl(142, 70%, 45%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                      stackId="a"
                    />

                    <Bar
                      dataKey="totalExpense"
                      name="Despesas"
                      fill="hsl(0, 84%, 60%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />

                    <Line
                      type="monotone"
                      dataKey="running_balance"
                      name="Saldo Projetado"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={visibleData.length < 30 ? { fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 } : false}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Minimap */}
            {totalPoints > INITIAL_VIEWPORT && (
              <div className="relative w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 h-full bg-primary/40 rounded-full transition-all duration-150 ease-out"
                  style={{
                    left: `${minimapRatio.left}%`,
                    width: `${minimapRatio.width}%`,
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Arraste para navegar · Scroll para zoom · Mostrando {viewEnd - viewStart} de {totalPoints} pontos
            </p>
          </div>
        )}
      </CardContent>
    </AppCard>
  );
}
