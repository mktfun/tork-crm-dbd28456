import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { BankTransaction } from '@/hooks/useBancos';

interface BankTransactionRowProps {
    transaction: BankTransaction;
    showBankName?: boolean;
    onClick?: (transactionId: string) => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function safeFormatDate(dateValue: string | null | undefined, formatStr: string): string {
    if (!dateValue) return '---';
    try {
        const parsed = parseISO(dateValue);
        if (!isValid(parsed)) return '---';
        return format(parsed, formatStr, { locale: ptBR });
    } catch {
        return '---';
    }
}

export function BankTransactionRow({
    transaction,
    showBankName = false,
    onClick
}: BankTransactionRowProps) {
    const isIncome = transaction.accountType === 'revenue' || transaction.accountType === 'income';
    const isPending = transaction.status === 'pending';

    return (
        <div
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group"
            onClick={() => onClick?.(transaction.transactionId)}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Data */}
                <div className="flex-shrink-0 text-sm text-muted-foreground w-16">
                    {safeFormatDate(transaction.transactionDate, 'dd/MM')}
                </div>

                {/* Descrição + Plano de Conta */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {transaction.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                            {transaction.accountName || 'Sem categoria'}
                        </Badge>
                        {showBankName && transaction.bankName && (
                            <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                    backgroundColor: transaction.bankColor ? `${transaction.bankColor}20` : undefined,
                                    borderColor: transaction.bankColor || undefined,
                                    color: transaction.bankColor || undefined
                                }}
                            >
                                {transaction.bankName}
                            </Badge>
                        )}
                        {isPending && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                                Pendente
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Valor */}
            <div className={`text-right font-semibold flex-shrink-0 ml-2 ${isIncome ? 'text-emerald-500' : 'text-red-500'
                }`}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </div>
        </div>
    );
}
