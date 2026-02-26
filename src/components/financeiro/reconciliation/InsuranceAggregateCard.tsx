import { format } from 'date-fns';
import { Building2, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import type { InsuranceAggregateItem } from '@/hooks/financeiro/usePendingInsuranceAggregate';

interface InsuranceAggregateCardProps {
  item: InsuranceAggregateItem;
  selected: boolean;
  onClick: () => void;
}

export function InsuranceAggregateCard({ item, selected, onClick }: InsuranceAggregateCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all duration-150',
        'hover:bg-secondary/50',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Building2 className="w-4.5 h-4.5 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-foreground truncate">
              {item.company_name}
            </p>
            <span className="text-sm font-bold text-emerald-400 shrink-0">
              +{formatCurrency(item.total_amount_pending)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="metallic" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
              <FileText className="w-2.5 h-2.5" />
              {item.transaction_count} comissões
            </Badge>
            {item.oldest_due_date && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                Desde {format(new Date(item.oldest_due_date), 'dd/MM/yyyy')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
