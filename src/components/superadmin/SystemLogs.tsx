import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        return 'bg-zinc-700 text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Logs do Sistema</h1>
          <p className="text-sm text-zinc-400 mt-1">Monitoramento de uso de IA e atividades do sistema</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* AI Usage Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Resumo de Uso de IA (30 dias)
          </CardTitle>
          <CardDescription>Agregação por provedor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 bg-zinc-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(aiLogs || []).map((log) => (
                <div 
                  key={log.provider}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getProviderColor(log.provider)}>
                      {log.provider.charAt(0).toUpperCase() + log.provider.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-zinc-100">
                      {log.count.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-zinc-500">requisições</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-700">
                    <p className="text-sm text-zinc-400">
                      {log.tokens.toLocaleString('pt-BR')} tokens
                    </p>
                  </div>
                </div>
              ))}
              {(!aiLogs || aiLogs.length === 0) && (
                <div className="col-span-3 text-center py-8 text-zinc-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum log de IA encontrado</p>
                  <p className="text-sm">Os logs aparecerão conforme o sistema for utilizado</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future: Activity Logs Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs de Atividade
          </CardTitle>
          <CardDescription>Histórico de ações administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-zinc-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sistema de logs de atividade em desenvolvimento</p>
            <p className="text-sm mt-1">Em breve: rastreamento de ações de usuários e admins</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
