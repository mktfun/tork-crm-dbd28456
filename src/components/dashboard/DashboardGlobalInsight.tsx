import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStrategicSummary } from '@/hooks/useStrategicSummary';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppCard } from '@/components/ui/app-card';

interface DashboardGlobalInsightProps {
  focus?: 'general' | 'finance' | 'crm';
}

const scopeLabels = { day: 'Dia', week: 'Semana', month: 'Mês' } as const;

export function DashboardGlobalInsight({ focus = 'general' }: DashboardGlobalInsightProps) {
  const {
    summary,
    createdAt,
    isCached,
    isLoading,
    isFetching,
    scope,
    setScope,
    refresh,
  } = useStrategicSummary(focus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedTime = createdAt
    ? format(parseISO(createdAt), "HH:mm", { locale: ptBR })
    : '--:--';

  const formattedDate = createdAt
    ? format(parseISO(createdAt), "'Hoje às' HH:mm", { locale: ptBR })
    : 'Aguardando...';

  return (
    <AppCard className="p-6 border-l-4 border-l-primary bg-card/50 backdrop-blur-xl shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h3 className="font-semibold text-foreground">Resumo Estratégico IA</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", (isRefreshing || isFetching) && "animate-spin")} />
          </Button>

          <div className="flex bg-muted/20 rounded-lg p-0.5">
            {(Object.keys(scopeLabels) as Array<keyof typeof scopeLabels>).map((key) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all duration-150",
                  scope === key
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {scopeLabels[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 text-sm text-foreground/80 leading-relaxed min-h-[40px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analisando dados do sistema...
          </div>
        ) : summary ? (
          <p>{summary}</p>
        ) : (
          <p className="text-muted-foreground">Sem dados suficientes para análise.</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-muted-foreground flex justify-between items-center">
        <span>
          {isCached ? `Cache • Atualizado: ${formattedDate}` : `Atualizado: ${formattedDate}`}
        </span>
      </div>
    </AppCard>
  );
}