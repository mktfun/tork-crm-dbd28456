import { useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, Eye, Building2, Brain, Globe, Settings, LayoutGrid, CreditCard, CalendarClock, Plus } from 'lucide-react';

// --- Types ---

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
}

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  period: string;
  registeredBy: string;
}

interface Organization {
  id: string;
  name: string;
  cnpj: string;
  plan: 'Free' | 'Pro';
  expiresAt: string;
  modules: OrgModules;
  metrics: OrgMetrics;
  paymentHistory: PaymentRecord[];
}

// --- Mock Data ---

const MOCK_ORGS: Organization[] = [
  {
    id: '1',
    name: 'Corretora Alpha Seguros',
    cnpj: '12.345.678/0001-90',
    plan: 'Pro',
    expiresAt: '2026-07-15',
    modules: { crm: true, portal: true, ia: true, config: true },
    metrics: { tokensUsed: 78500, tokensLimit: 100000, storageUsed: 4.2, storageLimit: 10 },
    paymentHistory: [
      { id: 'p1', date: '2026-01-15', amount: 299.9, period: '+1 ano', registeredBy: 'Admin Master' },
      { id: 'p2', date: '2025-01-10', amount: 149.9, period: '+6 meses', registeredBy: 'Admin Master' },
    ],
  },
  {
    id: '2',
    name: 'Beta Corretagem',
    cnpj: '98.765.432/0001-10',
    plan: 'Pro',
    expiresAt: '2026-04-20',
    modules: { crm: true, portal: true, ia: false, config: true },
    metrics: { tokensUsed: 45000, tokensLimit: 100000, storageUsed: 2.4, storageLimit: 10 },
    paymentHistory: [
      { id: 'p3', date: '2025-10-20', amount: 29.9, period: '+1 mês', registeredBy: 'Admin Master' },
    ],
  },
  {
    id: '3',
    name: 'Gamma Insurance Group',
    cnpj: '11.222.333/0001-44',
    plan: 'Free',
    expiresAt: '2026-01-01',
    modules: { crm: true, portal: false, ia: false, config: false },
    metrics: { tokensUsed: 1200, tokensLimit: 5000, storageUsed: 0.3, storageLimit: 1 },
    paymentHistory: [],
  },
  {
    id: '4',
    name: 'Delta Seguros Premium',
    cnpj: '55.666.777/0001-88',
    plan: 'Pro',
    expiresAt: '2025-12-01',
    modules: { crm: true, portal: true, ia: true, config: true },
    metrics: { tokensUsed: 92000, tokensLimit: 100000, storageUsed: 8.7, storageLimit: 10 },
    paymentHistory: [
      { id: 'p4', date: '2025-06-01', amount: 299.9, period: '+1 ano', registeredBy: 'Admin Master' },
    ],
  },
  {
    id: '5',
    name: 'Ômega Corretora Digital',
    cnpj: '33.444.555/0001-22',
    plan: 'Pro',
    expiresAt: '2026-09-30',
    modules: { crm: true, portal: true, ia: true, config: false },
    metrics: { tokensUsed: 31000, tokensLimit: 100000, storageUsed: 1.8, storageLimit: 10 },
    paymentHistory: [
      { id: 'p5', date: '2026-03-01', amount: 29.9, period: '+1 mês', registeredBy: 'Carlos Admin' },
      { id: 'p6', date: '2026-02-01', amount: 29.9, period: '+1 mês', registeredBy: 'Carlos Admin' },
    ],
  },
];

// --- Constants ---

const PLAN_STYLES: Record<string, string> = {
  Free: 'bg-muted text-muted-foreground border-border',
  Pro: 'bg-primary/15 text-primary border-primary/30',
};

const MODULE_META: { key: keyof OrgModules; label: string; icon: typeof Brain; description: string }[] = [
  { key: 'crm', label: 'CRM', icon: LayoutGrid, description: 'Pipeline de vendas, negociações e gestão de leads.' },
  { key: 'portal', label: 'Portal', icon: Globe, description: 'Portal do segurado para acesso a apólices e carteirinhas.' },
  { key: 'ia', label: 'IA', icon: Brain, description: 'Assistente inteligente com análise de documentos e automações.' },
  { key: 'config', label: 'Config', icon: Settings, description: 'Configurações avançadas, integrações e personalização.' },
];

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function formatDateBR(dateStr: string) {
  return format(new Date(dateStr), 'dd/MM/yyyy');
}

// --- Component ---

export function AdminControlCenter() {
  const [search, setSearch] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState('1 Mês');
  const [paymentDate, setPaymentDate] = useState('');

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

  const openDetails = (org: Organization) => {
    // Sync with latest state
    const latest = orgs.find((o) => o.id === org.id) || org;
    setSelectedOrg(latest);
    setSheetOpen(true);
  };

  const openPaymentDialog = () => {
    setPaymentAmount('');
    setPaymentPeriod('1 Mês');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = () => {
    // Mock: just close
    setPaymentDialogOpen(false);
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
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhuma organização encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => {
                const expired = isExpired(org.expiresAt);
                return (
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{formatDateBR(org.expiresAt)}</span>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrg && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground">{selectedOrg.name}</SheetTitle>
                <SheetDescription>{selectedOrg.cnpj}</SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
                  <TabsTrigger value="faturamento" className="flex-1">Faturamento</TabsTrigger>
                </TabsList>

                {/* Tab Geral */}
                <TabsContent value="geral" className="space-y-8 mt-4">
                  {/* Assinatura */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Assinatura</h3>
                    <select
                      value={selectedOrg.plan}
                      onChange={(e) => handlePlanChange(selectedOrg.id, e.target.value as Organization['plan'])}
                      className="flex h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      <option value="Free">Free</option>
                      <option value="Pro">Pro</option>
                    </select>
                  </section>

                  {/* Métricas */}
                  <section>
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
                </TabsContent>

                {/* Tab Faturamento */}
                <TabsContent value="faturamento" className="space-y-6 mt-4">
                  {/* Status Card */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Vencimento Atual</p>
                        <p className="text-lg font-semibold text-foreground">{formatDateBR(selectedOrg.expiresAt)}</p>
                      </div>
                      <Badge
                        className={
                          isExpired(selectedOrg.expiresAt)
                            ? 'ml-auto bg-destructive/15 text-destructive border-destructive/30'
                            : 'ml-auto bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        }
                      >
                        {isExpired(selectedOrg.expiresAt) ? 'Vencido' : 'Ativo'}
                      </Badge>
                    </div>
                  </div>

                  {/* Register Payment Button */}
                  <Button onClick={openPaymentDialog} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pagamento Manual
                  </Button>

                  {/* Payment History */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Histórico de Pagamentos
                    </h3>
                    {selectedOrg.paymentHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum pagamento registrado.</p>
                    ) : (
                      <div className="rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-border">
                              <TableHead className="text-muted-foreground text-xs">Data</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Valor</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Período</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Registrado por</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrg.paymentHistory.map((p) => (
                              <TableRow key={p.id} className="border-border">
                                <TableCell className="text-sm">{formatDateBR(p.date)}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-sm">{p.period}</TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                                    Pago
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.registeredBy}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </section>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento Manual</DialogTitle>
            <DialogDescription>
              Registre um pagamento para {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="text"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Período a adicionar</Label>
              <select
                value={paymentPeriod}
                onChange={(e) => setPaymentPeriod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="1 Mês">1 Mês</option>
                <option value="6 Meses">6 Meses</option>
                <option value="1 Ano">1 Ano</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePayment}>
              Salvar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---

function MetricBar({
  label,
  used,
  limit,
  format: fmt,
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
          {fmt(used)} / {fmt(limit)}
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
