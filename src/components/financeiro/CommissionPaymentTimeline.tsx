import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Circle, CircleDashed } from 'lucide-react';

interface CommissionPaymentTimelineProps {
  policyId: string;
  compact?: boolean;
}

type CommissionData = {
  id: string;
  description: string;
  transaction_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  reference_number: string | null;
  reconciled_at: string | null;
};

function StatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'reconciled':
      return <Badge variant="default" className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">Quitado</Badge>;
    case 'partial':
      return <Badge variant="outline" className="text-blue-500 border-blue-500 text-[10px] px-1.5 py-0 h-4">Parcial</Badge>;
    default:
      return <Badge variant="outline" className="text-amber-500 border-amber-500 text-[10px] px-1.5 py-0 h-4">Pendente</Badge>;
  }
}

export function CommissionPaymentTimeline({ policyId, compact = false }: CommissionPaymentTimelineProps) {
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commission-timeline', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          id, description, transaction_date, total_amount,
          paid_amount, status, reference_number, reconciled_at
        `)
        .eq('related_entity_id', policyId)
        .eq('related_entity_type', 'policy')
        .eq('is_void', false)
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar timeline de comissões:', error);
        return [];
      }
      return (data || []) as CommissionData[];
    },
    enabled: !!policyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        <StatusBadge status="pending" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {commissions.map((item) => {
        const totalAmount = Math.abs(item.total_amount ?? 0);
        const paidAmount = Math.abs(item.paid_amount ?? 0);
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        const progress = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
        const isComplete = progress >= 100;

        return (
          <div key={item.id} className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground truncate">
                Comissão ERP {item.reference_number ? `· Ref: ${item.reference_number}` : ''}
              </p>
              <StatusBadge status={item.status} />
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress
                value={progress}
                className="h-2.5"
                indicatorClassName={isComplete ? 'bg-emerald-500' : 'bg-amber-500'}
              />
              <p className="text-[11px] text-muted-foreground text-right">{Math.round(progress)}%</p>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-emerald-500">Recebido: {formatCurrency(paidAmount)}</span>
              <span className="text-red-400 font-bold">Faltante: {formatCurrency(remainingAmount)}</span>
              <span className="text-muted-foreground">Total: {formatCurrency(totalAmount)}</span>
            </div>

            {/* Timeline (skip in compact if no events) */}
            {!compact && (
              <TimelineEvents item={item} paidAmount={paidAmount} remainingAmount={remainingAmount} />
            )}

            {compact && paidAmount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className={isComplete ? 'text-emerald-500' : 'text-blue-500'} />
                <span>
                  {isComplete
                    ? `Quitado em ${item.reconciled_at ? format(new Date(item.reconciled_at), 'dd/MM/yyyy') : format(new Date(item.transaction_date), 'dd/MM/yyyy')}`
                    : 'Pagamento parcial registrado'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineEvents({
  item,
  paidAmount,
  remainingAmount,
}: {
  item: CommissionData;
  paidAmount: number;
  remainingAmount: number;
}) {
  const events: { icon: 'filled' | 'check' | 'dashed'; label: string; date?: string; amount: number; className: string }[] = [];

  if (paidAmount > 0 && item.status === 'partial') {
    events.push({
      icon: 'filled',
      label: 'Pagamento parcial registrado',
      date: item.reconciled_at
        ? format(new Date(item.reconciled_at), 'dd/MM/yyyy')
        : undefined,
      amount: paidAmount,
      className: 'text-blue-500',
    });
  }

  if (item.status === 'reconciled') {
    events.push({
      icon: 'check',
      label: 'Quitado',
      date: item.reconciled_at
        ? format(new Date(item.reconciled_at), 'dd/MM/yyyy')
        : format(new Date(item.transaction_date), 'dd/MM/yyyy'),
      amount: paidAmount,
      className: 'text-emerald-500',
    });
  }

  if (remainingAmount > 0) {
    events.push({
      icon: 'dashed',
      label: 'Saldo pendente',
      amount: remainingAmount,
      className: 'text-red-400',
    });
  }

  if (events.length === 0 && item.status === 'pending') {
    events.push({
      icon: 'dashed',
      label: 'Aguardando primeiro recebimento',
      amount: Math.abs(item.total_amount ?? 0),
      className: 'text-amber-500',
    });
  }

  return (
    <div className="relative pl-5 space-y-3">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />

      {events.map((event, index) => (
        <div key={index} className="relative flex items-start gap-3">
          {/* Dot */}
          <div className="absolute -left-5 mt-0.5">
            {event.icon === 'check' && <CheckCircle2 size={14} className="text-emerald-500" />}
            {event.icon === 'filled' && <Circle size={14} className="text-blue-500 fill-blue-500" />}
            {event.icon === 'dashed' && <CircleDashed size={14} className="text-muted-foreground" />}
          </div>

          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{event.label}</p>
              {event.date && (
                <p className="text-[11px] text-muted-foreground">{event.date}</p>
              )}
            </div>
            <span className={`text-xs font-bold whitespace-nowrap ${event.className}`}>
              {event.icon === 'dashed' ? '' : '+'}{formatCurrency(event.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
