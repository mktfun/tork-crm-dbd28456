import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AppCard } from '@/components/ui/app-card';
import { formatCurrency } from '@/utils/formatCurrency';
import { Policy, Transaction } from '@/types';

interface AdimplenciaDonutProps {
  apolices: Policy[];
  transacoes: Transaction[];
}

const COLORS = [
  'hsl(142, 71%, 45%)', // emerald - recebido
  'hsl(215, 20%, 65%)', // muted - pendente
];

export function AdimplenciaDonut({ apolices, transacoes }: AdimplenciaDonutProps) {
  const { projetada, realizada, percentual } = useMemo(() => {
    const projetada = apolices.reduce((sum, p) => {
      return sum + (p.premiumValue * (p.commissionRate || 0) / 100);
    }, 0);

    const realizada = transacoes
      .filter(t => {
        const desc = (t.description || '').toLowerCase();
        return t.nature === 'RECEITA' &&
          (t.status === 'PAGO' || t.status === 'REALIZADO') &&
          (desc.includes('comiss') || !!t.policyId);
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const percentual = projetada > 0 ? (realizada / projetada) * 100 : 0;

    return { projetada, realizada, percentual };
  }, [apolices, transacoes]);

  const data = [
    { name: 'Recebida', value: realizada },
    { name: 'Pendente', value: Math.max(0, projetada - realizada) },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-foreground font-medium">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <AppCard className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Taxa de Adimplência</h3>
      <p className="text-xs text-muted-foreground mb-4">Comissão projetada vs recebida</p>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          <div className="text-3xl font-bold text-foreground">{percentual.toFixed(1)}%</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Recebida
              </span>
              <span className="text-foreground font-medium">{formatCurrency(realizada)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                Pendente
              </span>
              <span className="text-foreground font-medium">{formatCurrency(Math.max(0, projetada - realizada))}</span>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  );
}
