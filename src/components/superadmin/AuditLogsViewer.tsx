import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-zinc-800" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Logs de Auditoria
        </CardTitle>
        <CardDescription>Histórico de operações do assistente de IA</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Data/Hora</TableHead>
                  <TableHead className="text-zinc-400">Usuário</TableHead>
                  <TableHead className="text-zinc-400">Operação</TableHead>
                  <TableHead className="text-zinc-400">Tool</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Tempo (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-zinc-300 text-sm">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      <div>
                        <p className="text-sm">{log.user?.nome_completo || 'N/A'}</p>
                        <p className="text-xs text-zinc-500">{log.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 font-mono text-sm">{log.operation_type}</TableCell>
                    <TableCell className="text-zinc-300 font-mono text-sm">{log.tool_name}</TableCell>
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
                    <TableCell className="text-zinc-300 text-sm">
                      {log.execution_time_ms || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-zinc-400">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, total)} de {total} logs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="border-zinc-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="border-zinc-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-400">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum log de auditoria encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
