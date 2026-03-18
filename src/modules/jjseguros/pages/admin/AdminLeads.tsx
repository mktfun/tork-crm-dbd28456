import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Eye, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/modules/jjseguros/components/admin/AdminLayout';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/jjseguros/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/jjseguros/components/ui/table';
import { Badge } from '@/modules/jjseguros/components/ui/badge';
import { Button } from '@/modules/jjseguros/components/ui/button';
import { Input } from '@/modules/jjseguros/components/ui/input';
import { Skeleton } from '@/modules/jjseguros/components/ui/skeleton';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

// Mapeamento de tipos de seguro para labels amigáveis
const insuranceTypeLabels: Record<string, string> = {
  auto: 'Automóvel',
  life: 'Vida',
  health: 'Saúde',
  residential: 'Residencial',
  business: 'Empresarial',
  travel: 'Viagem',
  endorsement: 'Endosso',
};

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  insurance_type: string;
  rd_station_synced: boolean;
  rd_station_error: string | null;
  is_completed?: boolean;
  abandoned_alert_sent?: boolean;
};

function getSyncStatus(lead: Lead): 'synced' | 'error' | 'pending' | 'abandoned' | 'partial' {
  // Primeiro verificar status de abandono/parcial
  if (lead.is_completed === false && lead.abandoned_alert_sent === true) return 'abandoned';
  if (lead.is_completed === false) return 'partial';
  
  // Depois verificar sync com RD Station
  if (lead.rd_station_error) return 'error';
  if (lead.rd_station_synced) return 'synced';
  return 'pending';
}

function SyncBadge({ lead }: { lead: Lead }) {
  const status = getSyncStatus(lead);
  
  const variants: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string; className?: string }> = {
    synced: { variant: 'default', label: 'Sincronizado', className: 'bg-green-600 hover:bg-green-700' },
    error: { variant: 'destructive', label: 'Erro' },
    pending: { variant: 'secondary', label: 'Pendente', className: 'bg-gray-500 hover:bg-gray-600 text-white' },
    abandoned: { variant: 'outline', label: 'Abandonado', className: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200' },
    partial: { variant: 'outline', label: 'Parcial', className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200' },
  };

  const { variant, label, className } = variants[status];

  return (
    <Badge 
      variant={variant}
      className={className}
    >
      {label}
    </Badge>
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function AdminLeads() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce da busca para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset para página 1 ao buscar
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-leads', currentPage, debouncedSearch],
    queryFn: async () => {
      // Cálculo do range: página 1 = 0-9, página 2 = 10-19, etc.
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('leads')
        .select('id, created_at, name, email, phone, insurance_type, rd_station_synced, rd_station_error, is_completed, abandoned_alert_sent', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Aplicar filtro de busca no servidor
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      // Aplicar paginação
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      return {
        leads: data as Lead[],
        totalCount: count ?? 0,
      };
    },
  });

  const totalPages = data ? Math.ceil(data.totalCount / ITEMS_PER_PAGE) : 0;
  const leads = data?.leads ?? [];

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Buscar todos os leads com o filtro aplicado (sem paginação)
      let query = supabase
        .from('leads')
        .select('created_at, name, email, phone, insurance_type, rd_station_synced, rd_station_error')
        .order('created_at', { ascending: false });

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data: allLeads, error } = await query;

      if (error) throw error;

      if (!allLeads || allLeads.length === 0) {
        toast.error('Nenhum lead para exportar');
        return;
      }

      // Gerar CSV manualmente
      const headers = ['Data', 'Nome', 'Email', 'Telefone', 'Ramo', 'Status'];
      const rows = allLeads.map(lead => {
        const status = lead.rd_station_error ? 'Erro' : lead.rd_station_synced ? 'Sincronizado' : 'Pendente';
        return [
          format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR }),
          `"${lead.name.replace(/"/g, '""')}"`,
          `"${lead.email.replace(/"/g, '""')}"`,
          `"${lead.phone.replace(/"/g, '""')}"`,
          insuranceTypeLabels[lead.insurance_type] || lead.insurance_type,
          status
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      
      // Download do arquivo
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${allLeads.length} leads exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar leads. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout title="Leads">
      <Card>
        <CardHeader>
          <CardTitle>Listagem de Leads</CardTitle>
          <CardDescription>
            Gerencie todos os leads capturados pelos formulários de cotação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca e Exportar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={handleExportCSV} 
              disabled={isExporting || isLoading}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </div>

          {/* Contagem de resultados */}
          {data && (
            <p className="text-sm text-muted-foreground">
              Mostrando {leads.length} de {data.totalCount} leads
              {debouncedSearch && ` (filtrado por "${debouncedSearch}")`}
            </p>
          )}

          {/* Tabela */}
          {isLoading ? (
            <LeadsTableSkeleton />
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              Erro ao carregar leads. Por favor, tente novamente.
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {debouncedSearch
                ? 'Nenhum lead encontrado com os filtros aplicados.'
                : 'Nenhum lead cadastrado ainda.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead>Ramo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{lead.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{lead.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {insuranceTypeLabels[lead.insurance_type] || lead.insurance_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SyncBadge lead={lead} />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/admin/leads/${lead.id}`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
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
