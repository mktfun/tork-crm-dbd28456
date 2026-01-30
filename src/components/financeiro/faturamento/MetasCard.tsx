import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, AlertCircle, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useGoalVsActual } from "@/hooks/useFinanceiro";
import { useState } from "react";
import { SetGoalModal } from "./SetGoalModal";

interface MetasCardProps {
  faturamentoAtual?: number;
}

export function MetasCard({ faturamentoAtual }: MetasCardProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const { data: goalData, isLoading, error } = useGoalVsActual(currentYear, currentMonth, 'revenue');
  const [showSetGoalModal, setShowSetGoalModal] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Meta Mensal
          </CardTitle>
          <CardDescription>
            Acompanhamento do objetivo de faturamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Meta Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar meta: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Se não houver meta cadastrada
  if (!goalData) {
    return (
      <>
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              Meta Mensal
            </CardTitle>
            <CardDescription>
              Defina uma meta para acompanhar seu desempenho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma meta definida para este mês
              </p>
              <Button onClick={() => setShowSetGoalModal(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                Definir Meta
              </Button>
            </div>
          </CardContent>
        </Card>

        <SetGoalModal 
          open={showSetGoalModal}
          onClose={() => setShowSetGoalModal(false)}
          year={currentYear}
          month={currentMonth}
        />
      </>
    );
  }

  // Dados da meta
  const metaMensal = Number(goalData.goalAmount);
  const faturamentoRealizado = Number(goalData.actualAmount);
  const percentualAtingido = Number(goalData.percentageAchieved);
  const faltaParaMeta = metaMensal - faturamentoRealizado;
  const isAcimaDaMeta = goalData.status === 'achieved';
  const isProximoDaMeta = goalData.status === 'near';

  return (
    <>
      <Card className={cn(
        "border-2",
        isAcimaDaMeta && "border-emerald-500/50 bg-emerald-500/5",
        isProximoDaMeta && "border-amber-500/50 bg-amber-500/5"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
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
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSetGoalModal(true)}
              className="h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
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
                {Math.round(percentualAtingido)}%
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
                {formatCurrency(faturamentoRealizado)}
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

      <SetGoalModal 
        open={showSetGoalModal}
        onClose={() => setShowSetGoalModal(false)}
        year={currentYear}
        month={currentMonth}
        currentGoal={metaMensal}
      />
    </>
  );
}
