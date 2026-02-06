import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsolidatedBalanceCardProps {
  totalBalance: number;
  accountCount: number;
  lastUpdate?: string;
  onRefresh?: () => void;
  onClick?: () => void;
}

export function ConsolidatedBalanceCard({
  totalBalance,
  accountCount,
  lastUpdate = "Atualizado agora",
  onRefresh,
  onClick
}: ConsolidatedBalanceCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card
      className={`bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01]' : ''
        }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Saldo Consolidado</CardTitle>
              <p className="text-xs text-muted-foreground">{lastUpdate}</p>
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-4xl font-bold text-primary">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-sm text-muted-foreground">
            {accountCount} {accountCount === 1 ? 'conta ativa' : 'contas ativas'}
            {onClick && <span className="ml-2 text-primary/70">• Clique para ver histórico</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

