import { useState } from "react";
import { Landmark, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccountBalances, useAssetAccounts } from "@/hooks/useCaixaData";
import { formatCurrency } from "@/utils/formatCurrency";
import { AppCard } from "@/components/ui/app-card";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Interface para conta bancária (alinhada com financial_accounts do Supabase)
interface BankAccountDisplay {
  id: string;
  name: string;
  code: string;
  type: string;
  balance: number;
}

const Bancos = () => {
  const queryClient = useQueryClient();
  const { data: accountBalances, isLoading, error, refetch } = useAccountBalances();
  const { data: assetAccounts } = useAssetAccounts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcular totais
  const totalBalance = accountBalances?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const activeAccountsCount = accountBalances?.length || 0;

  const handleAddBank = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de adicionar banco será implementada em breve.",
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['asset-accounts'] });
      toast({
        title: "Atualizado",
        description: "Saldos atualizados com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar saldos.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Função para obter cor baseada no tipo de conta
  const getAccountColor = (code: string): string => {
    const codeNum = parseInt(code?.replace(/\D/g, '') || '0');
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
    return colors[codeNum % colors.length];
  };

  // Função para obter emoji baseado no nome
  const getAccountIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('caixa')) return '💵';
    if (lowerName.includes('banco') || lowerName.includes('bank')) return '🏦';
    if (lowerName.includes('digital') || lowerName.includes('nubank') || lowerName.includes('inter')) return '💳';
    if (lowerName.includes('investimento')) return '📈';
    if (lowerName.includes('poupança') || lowerName.includes('reserva')) return '🐷';
    return '🏛️';
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão Bancária</h1>
            <p className="text-sm text-muted-foreground">
              Saldos, movimentações e conciliação bancária
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar contas bancárias.{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-destructive-foreground"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão Bancária</h1>
            <p className="text-sm text-muted-foreground">
              Saldos, movimentações e conciliação bancária
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={handleAddBank} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Conta
          </Button>
        </div>
      </div>

      {/* Saldo Consolidado */}
      <AppCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Saldo Consolidado</p>
            {isLoading ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalBalance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeAccountsCount} conta{activeAccountsCount !== 1 ? 's' : ''} ativa{activeAccountsCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Landmark className="w-12 h-12 text-primary/30" />
        </div>
      </AppCard>

      {/* Cards de Contas */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Contas Ativas</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <AppCard key={i} className="p-4">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </AppCard>
            ))}
          </div>
        ) : accountBalances && accountBalances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accountBalances.map((account: BankAccountDisplay) => (
              <AppCard key={account.id} className="p-4 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: getAccountColor(account.code) }}
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getAccountIcon(account.name)}</span>
                  <span className="font-medium text-sm truncate">{account.name}</span>
                </div>
                <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                  {formatCurrency(account.balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Código: {account.code || 'N/A'}
                </p>
              </AppCard>
            ))}
          </div>
        ) : (
          <AppCard className="p-8 text-center">
            <Landmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma conta cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Adicione suas contas bancárias para começar a gestão financeira.
            </p>
            <Button onClick={handleAddBank} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Primeira Conta
            </Button>
          </AppCard>
        )}
      </div>

      {/* Informação sobre integração */}
      {accountBalances && accountBalances.length > 0 && (
        <AppCard className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300">Integração com Módulo Financeiro</p>
              <p className="text-xs text-blue-300/70 mt-1">
                Os saldos são calculados automaticamente a partir das transações do módulo financeiro (Ledger de Partidas Dobradas).
              </p>
            </div>
          </div>
        </AppCard>
      )}
    </div>
  );
};

export default Bancos;
