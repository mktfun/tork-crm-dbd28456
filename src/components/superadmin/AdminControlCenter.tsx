import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MoreVertical, Eye, Building2 } from 'lucide-react';
import {
  useAdminBrokerages,
  useToggleModuleAccess,
  type AdminBrokerage,
} from '@/hooks/useAdminControlCenter';

type ModuleKey = 'crm' | 'portal' | 'ia' | 'config';

const MODULE_ACCESS_MAP: Record<ModuleKey, keyof AdminBrokerage> = {
  crm: 'has_crm_access',
  portal: 'has_portal_access',
  ia: 'has_ai_access',
  config: 'has_config_access',
};

const PLAN_STYLES: Record<string, string> = {
  Free: 'bg-muted text-muted-foreground border-border',
  Pro: 'bg-primary/15 text-primary border-primary/30',
};

const MODULE_LABELS: { key: ModuleKey; label: string }[] = [
  { key: 'crm', label: 'CRM' },
  { key: 'portal', label: 'Portal' },
  { key: 'ia', label: 'IA' },
  { key: 'config', label: 'Config' },
];

function isExpired(dateStr: string | null) {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'dd/MM/yyyy');
}

export function AdminControlCenter() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: brokerages = [], isLoading } = useAdminBrokerages();
  const toggleModule = useToggleModuleAccess();

  const filteredOrgs = brokerages.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleModuleToggle = (orgId: number, mod: ModuleKey) => {
    const org = brokerages.find((o) => o.id === orgId);
    if (!org) return;
    const currentValue = org[MODULE_ACCESS_MAP[mod]] as boolean;
    toggleModule.mutate({ brokerageId: orgId, moduleKey: mod, value: !currentValue });
  };

  const openDetails = (org: AdminBrokerage) => {
    navigate(`/superadmin/organizations/${org.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gerenciamento de Organizações</h2>
          <p className="text-sm text-muted-foreground">Controle de assinaturas, acessos modulares e faturamento.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar organização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Organização</TableHead>
              <TableHead className="text-muted-foreground">Plano</TableHead>
              <TableHead className="text-muted-foreground">Vencimento</TableHead>
              <TableHead className="text-muted-foreground">Módulos</TableHead>
              <TableHead className="text-muted-foreground w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhuma organização encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => {
                const expired = isExpired(org.subscription_valid_until);
                return (
                  <TableRow
                    key={org.id}
                    className="border-border hover:bg-muted/40 cursor-pointer"
                    onClick={() => openDetails(org)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{org.name}</span>
                        {org.cnpj && <span className="block text-xs text-muted-foreground">{org.cnpj}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={PLAN_STYLES[org.plan_type] ?? PLAN_STYLES.Free}>{org.plan_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{formatDateBR(org.subscription_valid_until)}</span>
                        <Badge
                          className={
                            expired
                              ? 'bg-destructive/15 text-destructive border-destructive/30'
                              : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          }
                        >
                          {expired ? 'Vencido' : 'Ativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-4">
                        {MODULE_LABELS.map((m) => (
                          <div key={m.key} className="flex items-center gap-1.5">
                            <Switch
                              checked={org[MODULE_ACCESS_MAP[m.key]] as boolean}
                              onCheckedChange={() => handleModuleToggle(org.id, m.key)}
                              className="scale-90"
                            />
                            <span className="text-xs text-muted-foreground hidden lg:inline">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(org)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
