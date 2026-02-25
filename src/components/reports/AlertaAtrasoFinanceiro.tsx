import { useMemo } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { Policy, Transaction } from '@/types';
import { parseISO, isBefore } from 'date-fns';

interface AlertaAtrasoFinanceiroProps {
  apolices: Policy[];
  transacoes: Transaction[];
}

export function AlertaAtrasoFinanceiro({ apolices, transacoes }: AlertaAtrasoFinanceiroProps) {
  const { totalAtrasado, qtdAtrasadas } = useMemo(() => {
    const hoje = new Date();

    // IDs de apólices que já têm transação PAGA de comissão
    const apolicesComPagamento = new Set(
      transacoes
        .filter(t => {
          const desc = (t.description || '').toLowerCase();
          return t.nature === 'RECEITA' &&
            (t.status === 'PAGO' || t.status === 'REALIZADO') &&
            (desc.includes('comiss') || !!t.policyId);
        })
        .map(t => t.policyId)
        .filter(Boolean)
    );

    // Apólices ativas com vigência já iniciada mas sem pagamento
    const atrasadas = apolices.filter(p => {
      if (p.status !== 'Ativa') return false;
      if (!p.startDate) return false;
      const startDate = parseISO(p.startDate);
      if (!isBefore(startDate, hoje)) return false;
      return !apolicesComPagamento.has(p.id);
    });

    const totalAtrasado = atrasadas.reduce((sum, p) => {
      return sum + (p.premiumValue * (p.commissionRate || 0) / 100);
    }, 0);

    return { totalAtrasado, qtdAtrasadas: atrasadas.length };
  }, [apolices, transacoes]);

  if (qtdAtrasadas === 0) {
    return (
      <AppCard className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Comissões Pendentes</h3>
        <p className="text-xs text-muted-foreground mb-4">Vigência ativada sem pagamento</p>
        <div className="flex items-center gap-3 text-emerald-400">
          <div className="bg-emerald-500/15 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium">Nenhum atraso detectado</p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Comissões Pendentes</h3>
      <p className="text-xs text-muted-foreground mb-4">Vigência ativada sem pagamento</p>
      
      <div className="flex items-center gap-4">
        <div className="bg-amber-500/15 p-3 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalAtrasado)}</p>
          <p className="text-xs text-muted-foreground">{qtdAtrasadas} apólice{qtdAtrasadas > 1 ? 's' : ''} sem comissão recebida</p>
        </div>
      </div>
    </AppCard>
  );
}
