import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppCard } from "@/components/ui/app-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertCircle } from "lucide-react";
import { useUpcomingPayables } from "@/hooks/useFinanceiro";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PayablesListProps {
    daysAhead?: number;
}

export function PayablesList({ daysAhead = 30 }: PayablesListProps) {
    const [period, setPeriod] = useState(daysAhead);
    const { data: payables, isLoading, error } = useUpcomingPayables(period);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString);
        return {
            day: format(date, "dd", { locale: ptBR }),
            month: format(date, "MMM", { locale: ptBR }).toUpperCase(),
        };
    };

    const totalAmount = payables?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-base">Pagamentos (Próximos {daysAhead} dias)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                <Skeleton className="w-[50px] h-[60px] rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-5 w-20" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                    <Alert variant="destructive" className="border-none bg-transparent p-0">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Erro ao carregar pagamentos: {error.message}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!payables || payables.length === 0) {
        return (
            <AppCard>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <CardTitle className="text-base">Pagamentos</CardTitle>
                        </div>
                        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                            <SelectTrigger className="w-[140px] bg-transparent border-border text-xs h-8">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Próximos 7 dias</SelectItem>
                                <SelectItem value="30">Próximos 30 dias</SelectItem>
                                <SelectItem value="90">Próximos 90 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <Calendar className="w-10 h-10 mb-2 opacity-20" />
                    <p>Nenhum pagamento previsto</p>
                    <p className="text-xs">para os próximos {period} dias</p>
                </CardContent>
            </AppCard>
        );
    }

    return (
        <AppCard>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-base">Pagamentos</CardTitle>
                    </div>
                    <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                        <SelectTrigger className="w-[140px] bg-transparent border-border text-xs h-8">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Próximos 7 dias</SelectItem>
                            <SelectItem value="30">Próximos 30 dias</SelectItem>
                            <SelectItem value="90">Próximos 90 dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {payables.map((payable) => {
                            const { day, month } = formatDate(payable.dueDate);
                            return (
                                <div
                                    key={payable.transactionId}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[50px]">
                                        <span className="text-2xl font-bold text-primary">{day}</span>
                                        <span className="text-xs text-muted-foreground uppercase">{month}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" title={payable.entityName}>
                                            {payable.entityName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate" title={payable.description}>
                                            {payable.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Em {payable.daysUntilDue} {payable.daysUntilDue === 1 ? 'dia' : 'dias'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-red-600">
                                            {formatCurrency(Number(payable.amount))}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total a Pagar</span>
                        <span className="text-lg font-bold text-red-600">
                            {formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </AppCard>
    );
}
