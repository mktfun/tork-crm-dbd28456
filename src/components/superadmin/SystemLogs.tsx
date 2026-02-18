import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAIUsageLogs } from '@/hooks/useSuperAdminStats';
import { RefreshCw, FileText, Brain } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function SystemLogs() {
  const { data: aiLogs, isLoading, refetch } = useAIUsageLogs(30);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-usage-logs'] });
    refetch();
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'mistral':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'openai':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento de uso de IA e atividades do sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* AI Usage Summary */}
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Resumo de Uso de IA (30 dias)</h3>
              <p className="text-sm text-muted-foreground">Agregação por provedor</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(aiLogs || []).map((log) => (
                <div
                  key={log.provider}
                  className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getProviderColor(log.provider)}>
                      {log.provider.charAt(0).toUpperCase() + log.provider.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl md:text-3xl font-bold text-foreground">
                      {log.count.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">requisições</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {log.tokens.toLocaleString('pt-BR')} tokens
                    </p>
                  </div>
                </div>
              ))}
              {(!aiLogs || aiLogs.length === 0) && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum log de IA encontrado</p>
                  <p className="text-sm">Os logs aparecerão conforme o sistema for utilizado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Future: Activity Logs */}
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Logs de Atividade</h3>
              <p className="text-sm text-muted-foreground">Histórico de ações administrativas</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sistema de logs de atividade em desenvolvimento</p>
            <p className="text-sm mt-1">Em breve: rastreamento de ações de usuários e admins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
