import { useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePayableReceivableTransactions } from "@/hooks/useFinanceiro";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp, AlertCircle, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AccountsPayableReceivableTable() {
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'pending' | 'paid'>('all');

  const { data: transactions, isLoading, error } = usePayableReceivableTransactions(
    activeTab,
    statusFilter
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: 'atrasado' | 'pendente' | 'pago') => {
    const variants = {
      atrasado: { variant: "destructive" as const, label: "Atrasado" },
      pendente: { variant: "secondary" as const, label: "Pendente" },
      pago: { variant: "default" as const, label: "Pago" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderTable = () => {
    if (isLoading) {
      return (
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
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar transações: {error.message}
          </AlertDescription>
        </Alert>
      );
    }

    if (!transactions || transactions.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma transação encontrada</p>
          <p className="text-xs mt-1">Tente alterar os filtros acima.</p>
        </div>
      );
    }

    return (
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
            {transactions.map((transaction) => (
              <TableRow key={transaction.transactionId}>
                <TableCell className="font-medium">
                  {formatDate(transaction.dueDate)}
                  {transaction.daysOverdue > 0 && (
                    <span className="text-xs text-red-600 ml-2">
                      ({transaction.daysOverdue}d atraso)
                    </span>
                  )}
                </TableCell>
                <TableCell>{transaction.entityName}</TableCell>
                <TableCell className="max-w-[250px] truncate" title={transaction.description}>
                  {transaction.description}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <span className={transaction.transactionType === 'receber' ? 'text-emerald-600' : 'text-red-600'}>
                    {formatCurrency(Number(transaction.amount))}
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
  };

  const receivableCount = transactions?.filter(t => t.transactionType === 'receber').length || 0;
  const payableCount = transactions?.filter(t => t.transactionType === 'pagar').length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Contas a Pagar e Receber</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(value) => value && setStatusFilter(value as any)}
              className="gap-1"
            >
              <ToggleGroupItem value="all" size="sm" className="text-xs">
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="overdue" size="sm" className="text-xs">
                Atrasados
              </ToggleGroupItem>
              <ToggleGroupItem value="pending" size="sm" className="text-xs">
                Pendentes
              </ToggleGroupItem>
              <ToggleGroupItem value="paid" size="sm" className="text-xs">
                Pagos
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receivable" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              A Receber ({receivableCount})
            </TabsTrigger>
            <TabsTrigger value="payable" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              A Pagar ({payableCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="receivable" className="mt-4">
            {renderTable()}
          </TabsContent>
          <TabsContent value="payable" className="mt-4">
            {renderTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
