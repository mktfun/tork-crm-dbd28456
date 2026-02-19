import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';

function formatCurrency(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

interface TransactionKpiCardProps {
    title: string;
    value: number;
    variant: 'success' | 'warning' | 'danger';
    icon: React.ElementType;
}

const iconStyles = {
    success: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]',
    warning: 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    danger: 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
};

export function TransactionKpiCard({ title, value, variant, icon: Icon }: TransactionKpiCardProps) {
    return (
        <AppCard className={cn(
            'flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70'
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">{formatCurrency(value)}</p>
                </div>
                <div className="p-2 rounded-lg bg-foreground/10 ml-3 shrink-0">
                    <Icon className={cn('w-5 h-5', iconStyles[variant])} />
                </div>
            </div>
        </AppCard>
    );
}

export { formatCurrency };
