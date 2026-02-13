import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppCard } from "@/components/ui/app-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertCircle } from "lucide-react";
import { useUpcomingReceivables, useUpcomingPayables } from "@/hooks/useFinanceiro";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UpcomingTransactionsListProps {
    daysAhead?: number;
}

export function UpcomingTransactionsList({ daysAhead = 30 }: UpcomingTransactionsListProps) {
    const [period, setPeriod] = useState(daysAhead);
    const [type, setType] = useState<'receivables' | 'payables'>('receivables');

    const { data: receivables, isLoading: loadingReceivables, error: errorReceivables } = useUpcomingReceivables(period);
    const { data: payables, isLoading: loadingPayables, error: errorPayables } = useUpcomingPayables(period);

    const isLoading = type === 'receivables' ? loadingReceivables : loadingPayables;
    const error = type === 'receivables' ? errorReceivables : errorPayables;
    const transactions = type === 'receivables' ? receivables : payables;

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

    const totalAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    if (isLoading) {
        return (
            <AppCard>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <CardTitle className="text-base">
                                {type === 'receivables' ? 'Recebíveis' : 'Pagamentos'}
                            </CardTitle>
                        </div>
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
            </AppCard>
        );
    }

    if (error) {
        return (
            <AppCard className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                    <Alert variant="destructive" className="border-none bg-transparent p-0">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Erro ao carregar dados: {error.message}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </AppCard>
        );
    }

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center p-6 text-muted-foreground h-[400px]">
            <Calendar className="w-10 h-10 mb-2 opacity-20" />
            <p>Nenhum {type === 'receivables' ? 'recebível' : 'pagamento'} previsto</p>
            <p className="text-xs">para os próximos {period} dias</p>
        </div>
    );

    return (
        <AppCard>
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-base">
                            {type === 'receivables' ? 'Recebíveis' : 'Pagamentos'}
                        </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tabs value={type} onValueChange={(v) => v && setType(v as 'receivables' | 'payables')} className="w-auto">
                            <TabsList className="bg-foreground/5 backdrop-blur-md border border-foreground/10 p-1 rounded-xl h-9">
                                <TabsTrigger value="receivables" className="text-xs px-3 h-7 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                                    A Receber
                                </TabsTrigger>
                                <TabsTrigger value="payables" className="text-xs px-3 h-7 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                                    A Pagar
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                            <SelectTrigger className="w-[110px] bg-transparent border-input text-xs h-9">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 dias</SelectItem>
                                <SelectItem value="30">30 dias</SelectItem>
                                <SelectItem value="90">90 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!transactions || transactions.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {transactions.map((transaction) => {
                                    const { day, month } = formatDate(transaction.dueDate);
                                    const isReceivable = type === 'receivables';
                                    const amountColor = isReceivable ? 'text-emerald-600' : 'text-red-600';

                                    return (
                                        <div
                                            key={transaction.transactionId}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[50px]">
                                                <span className="text-2xl font-bold text-primary">{day}</span>
                                                <span className="text-xs text-muted-foreground uppercase">{month}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate" title={transaction.entityName}>
                                                    {transaction.entityName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate" title={transaction.description}>
                                                    {transaction.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Em {transaction.daysUntilDue} {transaction.daysUntilDue === 1 ? 'dia' : 'dias'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-semibold ${amountColor}`}>
                                                    {formatCurrency(Number(transaction.amount))}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total {type === 'receivables' ? 'a Receber' : 'a Pagar'}</span>
                                <span className={`text-lg font-bold ${type === 'receivables' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(totalAmount)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </AppCard>
    );
}
