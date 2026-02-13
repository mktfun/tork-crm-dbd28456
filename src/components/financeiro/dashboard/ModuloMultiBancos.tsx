import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Building2, Wallet, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBankAccounts, type BankAccountType } from "@/hooks/useBancos";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getTypeBadge = (type: BankAccountType) => {
  const types = {
    corrente: { label: "Corrente", variant: "secondary" as const },
    poupanca: { label: "Poupança", variant: "outline" as const },
    investimento: { label: "Investimento", variant: "default" as const },
    giro: { label: "Giro", variant: "secondary" as const },
  };
  return types[type];
};

const getColorClasses = (color?: string) => {
  // Mapear cores hex para classes Tailwind
  const colorMap: Record<string, { text: string; bg: string }> = {
    '#FF6B00': { text: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    '#8A05BE': { text: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
    '#CC092F': { text: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
    '#FF8700': { text: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    '#0066CC': { text: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  };

  return color && colorMap[color]
    ? colorMap[color]
    : { text: 'text-primary', bg: 'bg-primary/10 border-primary/20' };
};

interface ModuloMultiBancosProps {
  onClick?: () => void;
}

export const ModuloMultiBancos = ({ onClick }: ModuloMultiBancosProps) => {
  const { data: summary, isLoading } = useBankAccounts();

  const totalBalance = summary?.totalBalance ?? 0;
  const activeAccounts = summary?.activeAccounts ?? 0;
  const accounts = summary?.accounts?.filter(acc => acc.isActive) ?? [];

  return (
    <Card
      className={cn(
        "h-full bg-card/50 border-border transition-all duration-200",
        onClick && "cursor-pointer hover:bg-card/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-foreground flex items-center justify-between text-base w-full">
          <span className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Saldos Bancários
          </span>
          {onClick && (
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-2">
        {/* ========== SALDO CONSOLIDADO (MOVIDO PARA CÁ) ========== */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Saldo Consolidado
            </span>
            <Badge variant="secondary" className="text-[10px] h-5">
              Atualizado agora
            </Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mt-1" />
          ) : (
            <>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeAccounts} {activeAccounts === 1 ? 'conta ativa' : 'contas ativas'}
              </p>
            </>
          )}
        </div>

        {/* ========== GRID DE BANCOS (LIMITADO A 2) ========== */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32 mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Nenhuma conta bancária cadastrada</p>
              <p className="text-xs text-muted-foreground/70">
                Adicione suas contas para visualizar os saldos
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {accounts.slice(0, 2).map((bank) => {
                const typeBadge = getTypeBadge(bank.accountType);
                const colors = getColorClasses(bank.color);

                return (
                  <div
                    key={bank.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors hover:bg-secondary/50",
                      colors.bg
                    )}
                  >
                    {/* Header do Mini-Card */}
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className={cn("h-4 w-4", colors.text)} />
                      <span className="text-sm font-medium text-foreground/80 truncate">
                        {bank.bankName}
                      </span>
                    </div>

                    {/* Saldo */}
                    <p className="text-lg font-semibold text-foreground mb-2">
                      {formatCurrency(bank.currentBalance)}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <Badge variant={typeBadge.variant} className="text-[10px] h-5">
                        {typeBadge.label}
                      </Badge>
                      {bank.lastSyncDate && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                          Sync: {new Date(bank.lastSyncDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicador de contas ocultas */}
            {accounts.length > 2 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  +{accounts.length - 2} {accounts.length - 2 === 1 ? 'outra conta' : 'outras contas'}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuloMultiBancos;
