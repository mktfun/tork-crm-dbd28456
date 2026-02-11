import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Building2, ArrowRight } from "lucide-react";
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
  const displayedAccounts = accounts.slice(0, 2);
  const hiddenCount = Math.max(0, accounts.length - 2);

  return (
    <Card
      className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Saldos Bancários
        </CardTitle>
        <Wallet className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-800 p-3">
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
            <Landmark className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 mb-1">Nenhuma conta bancária cadastrada</p>
            <p className="text-xs text-zinc-600">
              Adicione suas contas para visualizar os saldos
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {accounts.map((bank) => {
            const typeBadge = getTypeBadge(bank.accountType);
            const colors = getColorClasses(bank.color);

            return (
              <div
                key={bank.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors hover:bg-zinc-800/50",
                  colors.bg
                )}
              >
                {/* Header do Mini-Card */}
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={cn("h-4 w-4", colors.text)} />
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {bank.bankName}
                  </span>
                </div>

                {/* Saldo */}
                <p className="text-lg font-semibold text-white mb-2">
                  {formatCurrency(bank.currentBalance)}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Badge variant={typeBadge.variant} className="text-[10px] h-5">
                    {typeBadge.label}
                  </Badge>
                  {bank.lastSyncDate && (
                    <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">
                      Sync: {new Date(bank.lastSyncDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
    </Card >
  );
};

export default ModuloMultiBancos;
