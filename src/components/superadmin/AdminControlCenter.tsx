import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Eye, Ban, Building2, Brain, Globe, Settings, LayoutGrid } from 'lucide-react';

interface OrgModules {
  crm: boolean;
  portal: boolean;
  ia: boolean;
  config: boolean;
}

interface OrgMetrics {
  tokensUsed: number;
  tokensLimit: number;
  storageUsed: number;
  storageLimit: number;
  usersActive: number;
  usersLimit: number;
}

interface Organization {
  id: string;
  name: string;
  cnpj: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'Ativo' | 'Suspenso';
  modules: OrgModules;
  metrics: OrgMetrics;
}

const MOCK_ORGS: Organization[] = [
  {
    id: '1',
    name: 'Corretora Alpha Seguros',
    cnpj: '12.345.678/0001-90',
    plan: 'Enterprise',
    status: 'Ativo',
    modules: { crm: true, portal: true, ia: true, config: true },
    metrics: { tokensUsed: 78500, tokensLimit: 100000, storageUsed: 4.2, storageLimit: 10, usersActive: 12, usersLimit: 20 },
  },
  {
    id: '2',
    name: 'Beta Corretagem',
    cnpj: '98.765.432/0001-10',
    plan: 'Pro',
    status: 'Ativo',
    modules: { crm: true, portal: true, ia: false, config: true },
    metrics: { tokensUsed: 45000, tokensLimit: 100000, storageUsed: 2.4, storageLimit: 10, usersActive: 8, usersLimit: 15 },
  },
  {
    id: '3',
    name: 'Gamma Insurance Group',
    cnpj: '11.222.333/0001-44',
    plan: 'Free',
    status: 'Ativo',
    modules: { crm: true, portal: false, ia: false, config: false },
    metrics: { tokensUsed: 1200, tokensLimit: 5000, storageUsed: 0.3, storageLimit: 1, usersActive: 2, usersLimit: 3 },
  },
  {
    id: '4',
    name: 'Delta Seguros Premium',
    cnpj: '55.666.777/0001-88',
    plan: 'Enterprise',
    status: 'Suspenso',
    modules: { crm: true, portal: true, ia: true, config: true },
    metrics: { tokensUsed: 92000, tokensLimit: 100000, storageUsed: 8.7, storageLimit: 10, usersActive: 18, usersLimit: 20 },
  },
  {
    id: '5',
    name: 'Ômega Corretora Digital',
    cnpj: '33.444.555/0001-22',
    plan: 'Pro',
    status: 'Ativo',
    modules: { crm: true, portal: true, ia: true, config: false },
    metrics: { tokensUsed: 31000, tokensLimit: 100000, storageUsed: 1.8, storageLimit: 10, usersActive: 5, usersLimit: 15 },
  },
];

const PLAN_STYLES: Record<string, string> = {
  Free: 'bg-muted text-muted-foreground border-border',
  Pro: 'bg-primary/15 text-primary border-primary/30',
  Enterprise: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
};

const MODULE_META: { key: keyof OrgModules; label: string; icon: typeof Brain; description: string }[] = [
  { key: 'crm', label: 'CRM', icon: LayoutGrid, description: 'Pipeline de vendas, negociações e gestão de leads.' },
  { key: 'portal', label: 'Portal', icon: Globe, description: 'Portal do segurado para acesso a apólices e carteirinhas.' },
  { key: 'ia', label: 'IA', icon: Brain, description: 'Assistente inteligente com análise de documentos e automações.' },
  { key: 'config', label: 'Config', icon: Settings, description: 'Configurações avançadas, integrações e personalização.' },
];

export function AdminControlCenter() {
  const [search, setSearch] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleModuleToggle = (orgId: string, mod: keyof OrgModules) => {
    setOrgs((prev) =>
      prev.map((o) =>
        o.id === orgId ? { ...o, modules: { ...o.modules, [mod]: !o.modules[mod] } } : o
      )
    );
    if (selectedOrg?.id === orgId) {
      setSelectedOrg((prev) =>
        prev ? { ...prev, modules: { ...prev.modules, [mod]: !prev.modules[mod] } } : prev
      );
    }
  };

  const handlePlanChange = (orgId: string, plan: Organization['plan']) => {
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, plan } : o)));
    if (selectedOrg?.id === orgId) setSelectedOrg((prev) => prev ? { ...prev, plan } : prev);
  };

  const handleSuspend = (orgId: string) => {
    const newStatus = (s: Organization['status']) => (s === 'Ativo' ? 'Suspenso' : 'Ativo');
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, status: newStatus(o.status) } : o)));
    if (selectedOrg?.id === orgId)
      setSelectedOrg((prev) => prev ? { ...prev, status: newStatus(prev.status) } : prev);
  };

  const openDetails = (org: Organization) => {
    setSelectedOrg(org);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gerenciamento de Organizações</h2>
          <p className="text-sm text-muted-foreground">Controle de assinaturas, acessos modulares e uso.</p>
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
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Módulos</TableHead>
              <TableHead className="text-muted-foreground w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhuma organização encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
                <TableRow
                  key={org.id}
                  className="border-border hover:bg-muted/40 cursor-pointer"
                  onClick={() => openDetails(org)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium text-foreground">{org.name}</span>
                      <span className="block text-xs text-muted-foreground">{org.cnpj}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={PLAN_STYLES[org.plan]}>{org.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        org.status === 'Ativo'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-4">
                      {MODULE_META.map((m) => (
                        <div key={m.key} className="flex items-center gap-1.5">
                          <Switch
                            checked={org.modules[m.key]}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrg && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-foreground">{selectedOrg.name}</SheetTitle>
                <SheetDescription>{selectedOrg.cnpj}</SheetDescription>
              </SheetHeader>

              {/* Assinatura */}
              <section className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Assinatura</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedOrg.plan}
                    onChange={(e) => handlePlanChange(selectedOrg.id, e.target.value as Organization['plan'])}
                    className="flex h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                  <Button
                    variant={selectedOrg.status === 'Ativo' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleSuspend(selectedOrg.id)}
                  >
                    <Ban className="h-4 w-4 mr-1.5" />
                    {selectedOrg.status === 'Ativo' ? 'Suspender Acesso' : 'Reativar Acesso'}
                  </Button>
                </div>
              </section>

              {/* Métricas */}
              <section className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-4">Métricas de Uso</h3>
                <div className="space-y-5">
                  <MetricBar
                    label="Tokens de IA utilizados"
                    used={selectedOrg.metrics.tokensUsed}
                    limit={selectedOrg.metrics.tokensLimit}
                    format={(v) => v.toLocaleString('pt-BR')}
                  />
                  <MetricBar
                    label="Armazenamento"
                    used={selectedOrg.metrics.storageUsed}
                    limit={selectedOrg.metrics.storageLimit}
                    format={(v) => `${v} GB`}
                  />
                  <MetricBar
                    label="Usuários Ativos"
                    used={selectedOrg.metrics.usersActive}
                    limit={selectedOrg.metrics.usersLimit}
                    format={(v) => String(v)}
                  />
                </div>
              </section>

              {/* Permissões Globais */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-4">Permissões Globais</h3>
                <div className="space-y-4">
                  {MODULE_META.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.key}
                        className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{m.label}</span>
                            <Switch
                              checked={selectedOrg.modules[m.key]}
                              onCheckedChange={() => handleModuleToggle(selectedOrg.id, m.key)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricBar({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number;
  format: (v: number) => string;
}) {
  const pct = Math.round((used / limit) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {format(used)} / {format(limit)}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-2"
        indicatorClassName={pct > 85 ? 'bg-destructive' : pct > 60 ? 'bg-amber-500' : 'bg-primary'}
      />
    </div>
  );
}
