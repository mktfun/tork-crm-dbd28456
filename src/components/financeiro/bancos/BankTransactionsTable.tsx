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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Landmark } from "lucide-react";

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

  const getReconciliationBadge = (status?: TableTransaction['reconciliationStatus']) => {
    const variants = {
      conciliado: { className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none", label: "Conciliado" },
      pendente: { className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none", label: "Pendente" },
      divergente: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100 border-none", label: "Divergente" },
    };
    const config = variants[status || 'pendente'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3 px-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-base font-semibold text-gray-800">Movimentações Recentes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-gray-100">
              <TableHead className="pl-6 w-[120px]">Data</TableHead>
              {showBankColumn && <TableHead className="w-[140px]">Banco</TableHead>}
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-6 text-right w-[120px]">Conciliação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={`hover:bg-gray-50/50 border-gray-50 ${onTransactionClick ? 'cursor-pointer' : ''}`}
                onClick={() => onTransactionClick && onTransactionClick(transaction.id)}
              >
                <TableCell className="pl-6 font-medium text-gray-600">
                  {formatDate(transaction.date)}
                </TableCell>
                {showBankColumn && (
                  <TableCell className="font-medium text-gray-900">{transaction.bankName}</TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {transaction.type === 'entrada' ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-700 font-medium text-sm">Entrada</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        <span className="text-rose-700 font-medium text-sm">Saída</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-700">
                  {transaction.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 font-normal text-gray-600 border-gray-200 bg-white">
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={transaction.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}>
                    {transaction.type === 'entrada' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {getReconciliationBadge(transaction.reconciliationStatus)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
