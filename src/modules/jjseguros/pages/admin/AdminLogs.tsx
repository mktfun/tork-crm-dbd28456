import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Code, Filter } from 'lucide-react';
import { AdminLayout } from '@/modules/jjseguros/components/admin/AdminLayout';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/jjseguros/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/jjseguros/components/ui/table';
import { Badge } from '@/modules/jjseguros/components/ui/badge';
import { Button } from '@/modules/jjseguros/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/jjseguros/components/ui/select';
import { Skeleton } from '@/modules/jjseguros/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/modules/jjseguros/components/ui/sheet';

const ITEMS_PER_PAGE = 10;

type IntegrationLog = {
  id: string;
  created_at: string;
  lead_id: string | null;
  service_name: string;
  status: string;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  error_message: string | null;
  lead_email: string | null;
  lead_name: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status.toLowerCase() === 'success';
  return (
    <Badge 
      variant={isSuccess ? 'default' : 'destructive'}
      className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {isSuccess ? 'Sucesso' : 'Erro'}
    </Badge>
  );
}

function JsonViewer({ data, title }: { data: Record<string, unknown> | null; title: string }) {
  if (!data) return <p className="text-muted-foreground text-sm">Sem dados</p>;
  
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      <pre className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-[300px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function LogsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AdminLogs() {
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceFilter, statusFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-logs', currentPage, serviceFilter, statusFilter],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Query com JOIN para buscar email/nome do lead
      let query = supabase
        .from('integration_logs')
        .select(`
          id,
          created_at,
          lead_id,
          service_name,
          status,
          payload,
          response,
          error_message,
          leads!left(email, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (serviceFilter !== 'all') {
        query = query.eq('service_name', serviceFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transformar dados para incluir email/nome do lead
      const logs: IntegrationLog[] = (data || []).map((log: Record<string, unknown>) => {
        const leads = log.leads as { email?: string; name?: string } | null;
        return {
          id: log.id as string,
          created_at: log.created_at as string,
          lead_id: log.lead_id as string | null,
          service_name: log.service_name as string,
          status: log.status as string,
          payload: log.payload as Record<string, unknown> | null,
          response: log.response as Record<string, unknown> | null,
          error_message: log.error_message as string | null,
          lead_email: leads?.email ?? null,
          lead_name: leads?.name ?? null,
        };
      });

      return {
        logs,
        totalCount: count ?? 0,
      };
    },
  });

  const totalPages = data ? Math.ceil(data.totalCount / ITEMS_PER_PAGE) : 0;
  const logs = data?.logs ?? [];

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const clearFilters = () => {
    setServiceFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = serviceFilter !== 'all' || statusFilter !== 'all';

  return (
    <AdminLayout title="Logs de Integração">
      <Card>
        <CardHeader>
          <CardTitle>Logs de Integração</CardTitle>
          <CardDescription>
            Histórico de sincronizações com RD Station e outros serviços.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  <SelectItem value="rd_station">RD Station</SelectItem>
                  <SelectItem value="rd_webhook">RD Webhook</SelectItem>
                  <SelectItem value="n8n">n8n</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Contagem */}
          {data && (
            <p className="text-sm text-muted-foreground">
              Mostrando {logs.length} de {data.totalCount} logs
            </p>
          )}

          {/* Tabela */}
          {isLoading ? (
            <LogsTableSkeleton />
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              Erro ao carregar logs. Por favor, tente novamente.
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhum log encontrado com os filtros aplicados.'
                : 'Nenhum log de integração registrado ainda.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="w-[120px]">Serviço</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.lead_email ? (
                          <span className="text-sm">{log.lead_email}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.service_name === 'rd_station' ? 'RD Station' : 
                           log.service_name === 'rd_webhook' ? 'RD Webhook' : 
                           log.service_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {log.error_message ? (
                          <span className="text-destructive text-sm truncate block" title={log.error_message}>
                            {log.error_message.length > 50 
                              ? `${log.error_message.substring(0, 50)}...` 
                              : log.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Code className="mr-1 h-4 w-4" />
                              JSON
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[500px] sm:max-w-[500px]">
                            <SheetHeader>
                              <SheetTitle>Detalhes do Log</SheetTitle>
                              <SheetDescription>
                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                              </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Lead:</span>
                                  <p className="font-medium">{log.lead_name || log.lead_email || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Serviço:</span>
                                  <p className="font-medium">{log.service_name}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <p className="font-medium">{log.status}</p>
                                </div>
                              </div>

                              {log.error_message && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                  <h4 className="font-medium text-sm text-destructive mb-1">Mensagem de Erro</h4>
                                  <p className="text-sm">{log.error_message}</p>
                                </div>
                              )}

                              <JsonViewer data={log.payload} title="Payload Enviado" />
                              <JsonViewer data={log.response} title="Resposta Recebida" />
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
