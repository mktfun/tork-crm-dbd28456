import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BankTransaction } from "@/data/mocks/financeiroMocks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";

interface BankTransactionsTableProps {
  transactions: BankTransaction[];
}

export function BankTransactionsTable({ transactions }: BankTransactionsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const getReconciliationBadge = (status: BankTransaction['reconciliationStatus']) => {
    const variants = {
      conciliado: { variant: "default" as const, label: "Conciliado" },
      pendente: { variant: "secondary" as const, label: "Pendente" },
      divergente: { variant: "destructive" as const, label: "Divergente" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">Movimentações Recentes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Conciliação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>{transaction.bankName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {transaction.type === 'entrada' ? (
                        <>
                          <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600 text-sm">Entrada</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 text-sm">Saída</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={transaction.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}>
                      {transaction.type === 'entrada' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getReconciliationBadge(transaction.reconciliationStatus)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
