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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountTransaction } from "@/data/mocks/financeiroMocks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp } from "lucide-react";

interface AccountsPayableReceivableTableProps {
  transactions: AccountTransaction[];
}

export function AccountsPayableReceivableTable({ transactions }: AccountsPayableReceivableTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: AccountTransaction['status']) => {
    const variants = {
      atrasado: { variant: "destructive" as const, label: "Atrasado" },
      pendente: { variant: "secondary" as const, label: "Pendente" },
      pago: { variant: "default" as const, label: "Pago" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const receivables = transactions.filter(t => t.type === 'receber');
  const payables = transactions.filter(t => t.type === 'pagar');

  const renderTable = (data: AccountTransaction[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {formatDate(transaction.dueDate)}
              </TableCell>
              <TableCell>{transaction.entity}</TableCell>
              <TableCell className="max-w-[250px] truncate">
                {transaction.description}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className={transaction.type === 'receber' ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCurrency(transaction.amount)}
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(transaction.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contas a Pagar e Receber</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="receber" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receber" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              A Receber ({receivables.length})
            </TabsTrigger>
            <TabsTrigger value="pagar" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              A Pagar ({payables.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="receber" className="mt-4">
            {renderTable(receivables)}
          </TabsContent>
          <TabsContent value="pagar" className="mt-4">
            {renderTable(payables)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
