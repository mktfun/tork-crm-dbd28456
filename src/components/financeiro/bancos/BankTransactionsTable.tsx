import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Landmark } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";

export interface TableTransaction {
  id: string;
  date: string;
  bankName?: string;
  type: 'entrada' | 'saida';
  description: string;
  category: string;
  amount: number;
  reconciliationStatus?: 'conciliado' | 'pendente' | 'divergente';
}

interface BankTransactionsTableProps {
  transactions: TableTransaction[];
  showBankColumn?: boolean;
  onTransactionClick?: (id: string) => void;
}

export function BankTransactionsTable({
  transactions,
  showBankColumn = true,
  onTransactionClick
}: BankTransactionsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <AppCard className="p-0 shadow-lg border-border bg-card">
      {/* Header padronizado */}
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Movimentações Recentes</h3>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="pl-6 w-[120px] text-muted-foreground">Data</TableHead>
              {showBankColumn && <TableHead className="w-[140px] text-muted-foreground">Banco</TableHead>}
              <TableHead className="w-[120px] text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-muted-foreground">Descrição</TableHead>
              <TableHead className="text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-right text-muted-foreground pr-6">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={`hover:bg-muted/50 border-border ${onTransactionClick ? 'cursor-pointer' : ''}`}
                onClick={() => onTransactionClick && onTransactionClick(transaction.id)}
              >
                <TableCell className="pl-6 font-medium text-muted-foreground">
                  {formatDate(transaction.date)}
                </TableCell>
                {showBankColumn && (
                  <TableCell className="font-medium text-foreground">{transaction.bankName}</TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {transaction.type === 'entrada' ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500 font-medium text-sm">Entrada</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        <span className="text-rose-500 font-medium text-sm">Saída</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-foreground">
                  {transaction.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 font-normal text-muted-foreground border-border bg-background">
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium pr-6">
                  <span className={transaction.type === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}>
                    {transaction.type === 'entrada' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppCard>
  );
}
