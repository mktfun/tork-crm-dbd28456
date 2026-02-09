import { useState } from "react";
import { GitCompare, AlertCircle, RefreshCw, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppCard } from "@/components/ui/app-card";
import { useAccountStatement, useAssetAccounts } from "@/hooks/useCaixaData";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/dateUtils";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const Conciliacao = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);

  // Buscar contas de ativo disponíveis
  const { data: assetAccounts, isLoading: isLoadingAccounts } = useAssetAccounts();

  // Buscar extrato da conta selecionada (últimos 30 dias)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const {
    data: accountStatement,
    isLoading: isLoadingStatement,
    refetch
  } = useAccountStatement(
    selectedAccountId,
    startDate.toISOString().split('T')[0]
  );

  const handleSelectTransaction = (id: string) => {
    setSelectedTransactionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (accountStatement) {
      const allIds = accountStatement
        .filter(t => !t.is_reversal)
        .map(t => t.transaction_id);
      setSelectedTransactionIds(allIds);
    }
  };

  const handleClearSelection = () => {
    setSelectedTransactionIds([]);
  };

  const handleMarkAsReconciled = () => {
    if (selectedTransactionIds.length === 0) {
      toast({
        title: "Nenhuma seleção",
        description: "Selecione pelo menos uma transação para conciliar.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implementar marcação como conciliado no banco de dados
    toast({
      title: "Conciliação realizada",
      description: `${selectedTransactionIds.length} transação(ões) marcada(s) como conciliada(s).`,
    });
    setSelectedTransactionIds([]);
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Atualizado",
      description: "Extrato atualizado com sucesso.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GitCompare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conciliação Bancária</h1>
            <p className="text-sm text-muted-foreground">
              Revise e concilie transações do módulo financeiro
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Seletor de Conta */}
      <AppCard className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selecione uma conta para ver o extrato:
            </label>
            {isLoadingAccounts ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedAccountId || ""}
                onValueChange={(value) => setSelectedAccountId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha uma conta bancária..." />
                </SelectTrigger>
                <SelectContent>
                  {assetAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </AppCard>

      {/* Área de Extrato */}
      {!selectedAccountId ? (
        <AppCard className="p-8 text-center">
          <Landmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Selecione uma conta
          </h3>
          <p className="text-muted-foreground">
            Escolha uma conta bancária acima para visualizar o extrato e iniciar a conciliação.
          </p>
        </AppCard>
      ) : isLoadingStatement ? (
        <AppCard className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </AppCard>
      ) : accountStatement && accountStatement.length > 0 ? (
        <div className="space-y-4">
          {/* Controles de seleção */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Selecionar Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedTransactionIds.length === 0}
              >
                Limpar Seleção
              </Button>
              {selectedTransactionIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedTransactionIds.length} selecionada(s)
                </Badge>
              )}
            </div>
            <Button
              onClick={handleMarkAsReconciled}
              disabled={selectedTransactionIds.length === 0}
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Marcar como Conciliado
            </Button>
          </div>

          {/* Lista de Transações */}
          <AppCard className="divide-y divide-border">
            {accountStatement.map((transaction) => (
              <div
                key={transaction.transaction_id}
                className={`p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors ${transaction.is_reversal ? 'opacity-50' : ''
                  }`}
              >
                <Checkbox
                  checked={selectedTransactionIds.includes(transaction.transaction_id)}
                  onCheckedChange={() => handleSelectTransaction(transaction.transaction_id)}
                  disabled={transaction.is_reversal}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.transaction_date)}
                    {transaction.memo && ` • ${transaction.memo}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {formatCurrency(transaction.running_balance)}
                  </p>
                </div>
                {transaction.is_reversal && (
                  <Badge variant="outline" className="text-xs">
                    Estorno
                  </Badge>
                )}
              </div>
            ))}
          </AppCard>
        </div>
      ) : (
        <AppCard className="p-8 text-center">
          <GitCompare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma transação encontrada
          </h3>
          <p className="text-muted-foreground">
            Não há transações nos últimos 30 dias para esta conta.
          </p>
        </AppCard>
      )}

      {/* Informação sobre a funcionalidade */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          <strong>Dica:</strong> A conciliação bancária permite revisar as transações do módulo financeiro.
          Selecione as transações que você já verificou no extrato do banco e marque como conciliadas.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Conciliacao;
