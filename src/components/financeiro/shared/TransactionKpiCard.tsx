import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

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

const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-600'
};

const iconStyles = {
    success: 'bg-emerald-500/20 text-emerald-500',
    warning: 'bg-amber-500/20 text-amber-500',
    danger: 'bg-rose-500/20 text-rose-500'
};

export function TransactionKpiCard({ title, value, variant, icon: Icon }: TransactionKpiCardProps) {
    return (
        <Card className={cn('border', styles[variant])}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{title}</p>
                        <p className="text-lg font-bold">{formatCurrency(value)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export { formatCurrency };
