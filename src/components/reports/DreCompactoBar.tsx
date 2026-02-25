import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AppCard } from '@/components/ui/app-card';
import { formatCurrency } from '@/utils/formatCurrency';
import { Policy, Transaction } from '@/types';
import { useMemo } from 'react';

interface DreCompactoBarProps {
  apolices: Policy[];
  transacoes: Transaction[];
  totalGanhos: number;
  totalPerdas: number;
}

export function DreCompactoBar({ apolices, transacoes, totalGanhos, totalPerdas }: DreCompactoBarProps) {
  const comissaoProjetada = useMemo(() => {
    return apolices.reduce((sum, p) => sum + (p.premiumValue * (p.commissionRate || 0) / 100), 0);
  }, [apolices]);

  const data = [
    {
      name: 'Resultado',
      projetada: comissaoProjetada,
      realizada: totalGanhos,
      despesas: totalPerdas,
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppCard className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">DRE Compacto</h3>
      <p className="text-xs text-muted-foreground mb-4">Projetado vs Realizado vs Despesas</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="name" hide />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Bar dataKey="projetada" name="Projetada" fill="hsl(215, 60%, 55%)" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar dataKey="realizada" name="Realizada" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppCard>
  );
}
