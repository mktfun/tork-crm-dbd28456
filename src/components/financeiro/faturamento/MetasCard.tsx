import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetasCardProps {
  metaMensal?: number;
  faturamentoAtual?: number;
}

export function MetasCard({
  metaMensal = 400000,
  faturamentoAtual = 345200,
}: MetasCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const percentualAtingido = Math.round((faturamentoAtual / metaMensal) * 100);
  const faltaParaMeta = metaMensal - faturamentoAtual;
  const isAcimaDaMeta = percentualAtingido >= 100;
  const isProximoDaMeta = percentualAtingido >= 80 && percentualAtingido < 100;

  return (
    <Card className={cn(
      "border-2",
      isAcimaDaMeta && "border-emerald-500/50 bg-emerald-500/5",
      isProximoDaMeta && "border-amber-500/50 bg-amber-500/5"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className={cn(
            "w-5 h-5",
            isAcimaDaMeta ? "text-emerald-600" : isProximoDaMeta ? "text-amber-600" : "text-primary"
          )} />
          Meta Mensal
        </CardTitle>
        <CardDescription>
          Acompanhamento do objetivo de faturamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              "font-bold text-lg",
              isAcimaDaMeta ? "text-emerald-600" : isProximoDaMeta ? "text-amber-600" : "text-foreground"
            )}>
              {percentualAtingido}%
            </span>
          </div>
          <Progress 
            value={Math.min(percentualAtingido, 100)} 
            className={cn(
              "h-3",
              isAcimaDaMeta && "[&>div]:bg-emerald-600",
              isProximoDaMeta && "[&>div]:bg-amber-600"
            )}
          />
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Faturamento Atual</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(faturamentoAtual)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Meta do Mês</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(metaMensal)}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          isAcimaDaMeta ? "bg-emerald-500/10 text-emerald-600" : 
          isProximoDaMeta ? "bg-amber-500/10 text-amber-600" : 
          "bg-muted text-muted-foreground"
        )}>
          {isAcimaDaMeta ? (
            <>
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">
                Meta atingida! Superou em {formatCurrency(Math.abs(faltaParaMeta))}
              </span>
            </>
          ) : isProximoDaMeta ? (
            <>
              <Target className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">
                Faltam {formatCurrency(faltaParaMeta)} para atingir a meta
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">
                Faltam {formatCurrency(faltaParaMeta)} para atingir a meta
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
