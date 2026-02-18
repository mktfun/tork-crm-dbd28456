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

const variantStyles = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    danger: 'border-rose-500/30 bg-rose-500/5'
};

const iconStyles = {
    success: 'bg-emerald-500/20 text-emerald-500',
    warning: 'bg-amber-500/20 text-amber-500',
    danger: 'bg-rose-500/20 text-rose-500'
};

export function TransactionKpiCard({ title, value, variant, icon: Icon }: TransactionKpiCardProps) {
    return (
        <AppCard className={cn(
            'flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer hover:bg-secondary/70',
            variantStyles[variant]
        )}>
            <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(value)}</p>
                </div>
            </div>
        </AppCard>
    );
}

export { formatCurrency };
