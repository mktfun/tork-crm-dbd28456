import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, Plus, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BankAccountCard } from "@/components/financeiro/bancos/BankAccountCard";
import { ConsolidatedBalanceCard } from "@/components/financeiro/bancos/ConsolidatedBalanceCard";
import { AddBankAccountModal } from "@/components/financeiro/bancos/AddBankAccountModal";
import { EditBankAccountModal } from "@/components/financeiro/bancos/EditBankAccountModal";
import { DeleteBankAccountDialog } from "@/components/financeiro/bancos/DeleteBankAccountDialog";
import { useBankAccounts, BankAccount } from "@/hooks/useBancos";
import { toast } from "@/hooks/use-toast";

const Bancos = () => {
  const navigate = useNavigate();

  // Dados reais do Supabase
  const { data: bankData, isLoading, error, refetch } = useBankAccounts();

  // State para modais de CRUD
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

  // Navegar para página de detalhes do banco
  const handleOpenBankDashboard = (account: BankAccount) => {
    navigate(`/dashboard/bancos/${account.id}`);
  };

  // Navegar para visão consolidada
  const handleOpenConsolidatedDashboard = () => {
    navigate('/dashboard/bancos/todos');
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Atualizado",
      description: "Saldos atualizados com sucesso.",
    });
  };

  const handleEditBank = (account: BankAccount) => {
    setEditingAccount(account);
  };

  const handleDeleteBank = (account: BankAccount) => {
    setDeletingAccount(account);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <Landmark className="w-12 h-12 mb-4 opacity-50" />
        <p>Erro ao carregar contas bancárias</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Tentar novamente
        </Button>
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
              Saldos, movimentações e histórico por conta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Banco
          </Button>
        </div>
      </div>

      {/* Saldo Consolidado */}
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ConsolidatedBalanceCard
          totalBalance={bankData?.totalBalance || 0}
          accountCount={bankData?.activeAccounts || 0}
          onRefresh={handleRefresh}
          onClick={handleOpenConsolidatedDashboard}
        />
      )}

      {/* Cards de Bancos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Módulo Multi-Bancos</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : bankData?.accounts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Landmark className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma conta bancária cadastrada
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar primeiro banco
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card especial: Todos os Bancos */}
            <Card
              className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] group border-primary/30"
              style={{ borderLeftColor: 'hsl(var(--primary))', borderLeftWidth: '4px' }}
              onClick={handleOpenConsolidatedDashboard}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        Todos os Bancos
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Visão consolidada
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(bankData?.totalBalance || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bankData?.activeAccounts} {bankData?.activeAccounts === 1 ? 'conta ativa' : 'contas ativas'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cards de cada banco */}
            {bankData?.accounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                onClick={handleOpenBankDashboard}
                onEdit={handleEditBank}
                onDelete={handleDeleteBank}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais de CRUD */}
      <AddBankAccountModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />

      {editingAccount && (
        <EditBankAccountModal
          open={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          account={editingAccount}
        />
      )}

      {deletingAccount && (
        <DeleteBankAccountDialog
          open={!!deletingAccount}
          onClose={() => setDeletingAccount(null)}
          account={deletingAccount}
        />
      )}
    </div>
  );
};

export default Bancos;
