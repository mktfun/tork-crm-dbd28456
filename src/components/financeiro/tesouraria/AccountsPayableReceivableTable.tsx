import { useState, useMemo } from "react";
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
import { AppCard } from "@/components/ui/app-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayableReceivableTransactions } from "@/hooks/useFinanceiro";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp, AlertCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AccountsPayableReceivableTable() {
  const [activeTab, setActiveTab] = useState<'receber' | 'pagar'>('receber');
  const [statusFilter, setStatusFilter] = useState<'all' | 'atrasado' | 'pendente' | 'pago'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: transactions, isLoading, error } = usePayableReceivableTransactions(
    activeTab,
    statusFilter
  );

  // Reset page when filters change
  const handleTabChange = (tab: 'receber' | 'pagar') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleStatusChange = (status: 'all' | 'atrasado' | 'pendente' | 'pago') => {
    setStatusFilter(status);
    setPage(1);
  };

  // Pagination logic
  const totalItems = transactions?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedTransactions = useMemo(() => {
    if (!transactions) return [];
    const start = (page - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, page, pageSize]);

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
        <div className="bg-transparent">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="pl-6">Vencimento</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="pr-6"><Skeleton className="h-5 w-20" /></TableCell>
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
      <div className="bg-transparent rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="pl-6">Vencimento</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.transactionId} className="hover:bg-muted/50 border-border">
                <TableCell className="pl-6 font-medium">
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
                <TableCell className="pr-6">
                  {getStatusBadge(transaction.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Pagination controls component
  const renderPagination = () => {
    if (totalItems <= pageSize) return null;

    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <span className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalItems)} de {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const receivableCount = transactions?.filter(t => t.transactionType === 'receber').length || 0;
  const payableCount = transactions?.filter(t => t.transactionType === 'pagar').length || 0;

  return (
    <AppCard>
      <CardHeader className="pb-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Contas a Pagar e Receber</CardTitle>
              <p className="text-sm text-muted-foreground">Gerencie suas pendências financeiras</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => handleStatusChange(value as any)}>
              <SelectTrigger className="w-[180px] bg-transparent border-border">
                <SelectValue placeholder="Filtrar por status..." />
              </SelectTrigger>
              <SelectContent className="glass-component">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'receber' | 'pagar')} className="w-full">
          <div className="px-4 pb-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl h-10">
              <TabsTrigger
                value="receber"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-white/5 gap-2"
              >
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                A Receber ({receivableCount})
              </TabsTrigger>
              <TabsTrigger
                value="pagar"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-white/5 gap-2"
              >
                <TrendingDown className="w-4 h-4 text-red-500" />
                A Pagar ({payableCount})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="receber" className="mt-0">
            {renderTable()}
            <div className="px-4">
              {renderPagination()}
            </div>
          </TabsContent>
          <TabsContent value="pagar" className="mt-0">
            {renderTable()}
            <div className="px-4">
              {renderPagination()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </AppCard>
  );
}
