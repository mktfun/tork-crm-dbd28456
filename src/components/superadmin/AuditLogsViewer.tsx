import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditLogsViewer() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const { data, isLoading } = useAuditLogs({ limit, offset: page * limit });

  if (isLoading) {
    return (
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 pt-0 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="glass-component p-0 shadow-lg border-border bg-card">
      {/* Header padronizado */}
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Logs de Auditoria</h3>
            <p className="text-sm text-muted-foreground">Histórico de operações do assistente de IA</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-0">
        {logs.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                  <TableHead className="text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-muted-foreground">Operação</TableHead>
                  <TableHead className="text-muted-foreground">Tool</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Tempo (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div>
                        <p className="text-sm">{log.user?.nome_completo || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{log.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-mono text-sm">{log.operation_type}</TableCell>
                    <TableCell className="text-foreground font-mono text-sm">{log.tool_name}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" />
                          Falha
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.execution_time_ms || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            <div className="flex items-center justify-between border-t border-border p-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, total)} de {total} logs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum log de auditoria encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
