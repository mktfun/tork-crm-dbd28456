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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MoreVertical, Eye, Building2, Brain, Globe, Settings, LayoutGrid, CreditCard, CalendarClock, Plus, Loader2 } from 'lucide-react';
import {
  useAdminBrokerages,
  useBrokeragePayments,
  useToggleModuleAccess,
  useUpdateBrokeragePlan,
  useRegisterPayment,
  type AdminBrokerage,
} from '@/hooks/useAdminControlCenter';

// --- Constants ---

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

const MODULE_META: { key: ModuleKey; label: string; icon: typeof Brain; description: string }[] = [
  { key: 'crm', label: 'CRM', icon: LayoutGrid, description: 'Pipeline de vendas, negociações e gestão de leads.' },
  { key: 'portal', label: 'Portal', icon: Globe, description: 'Portal do segurado para acesso a apólices e carteirinhas.' },
  { key: 'ia', label: 'IA', icon: Brain, description: 'Assistente inteligente com análise de documentos e automações.' },
  { key: 'config', label: 'Config', icon: Settings, description: 'Configurações avançadas, integrações e personalização.' },
];

function isExpired(dateStr: string | null) {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'dd/MM/yyyy');
}

// --- Component ---

export function AdminControlCenter() {
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<AdminBrokerage | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState('1 Mês');
  const [paymentDate, setPaymentDate] = useState('');

  // Data hooks
  const { data: brokerages = [], isLoading } = useAdminBrokerages();
  const { data: payments = [], isLoading: paymentsLoading } = useBrokeragePayments(selectedOrg?.id ?? null);
  const toggleModule = useToggleModuleAccess();
  const updatePlan = useUpdateBrokeragePlan();
  const registerPayment = useRegisterPayment();

  const filteredOrgs = brokerages.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleModuleToggle = (orgId: number, mod: ModuleKey) => {
    const org = brokerages.find((o) => o.id === orgId);
    if (!org) return;
    const currentValue = org[MODULE_ACCESS_MAP[mod]] as boolean;
    toggleModule.mutate({ brokerageId: orgId, moduleKey: mod, value: !currentValue });
  };

  const handlePlanChange = (orgId: number, plan: string) => {
    updatePlan.mutate({ brokerageId: orgId, planType: plan });
  };

  const openDetails = (org: AdminBrokerage) => {
    setSelectedOrg(org);
    setSheetOpen(true);
  };

  const openPaymentDialog = () => {
    setPaymentAmount('');
    setPaymentPeriod('1 Mês');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedOrg) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    registerPayment.mutate({
      brokerageId: selectedOrg.id,
      amount,
      periodAdded: paymentPeriod,
      paymentDate: new Date(paymentDate).toISOString(),
      currentValidUntil: selectedOrg.subscription_valid_until,
    }, {
      onSuccess: () => setPaymentDialogOpen(false),
    });
  };

  // Keep selectedOrg in sync with latest data
  const currentOrg = selectedOrg ? brokerages.find((o) => o.id === selectedOrg.id) ?? selectedOrg : null;

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
                        {MODULE_META.map((m) => (
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

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {currentOrg && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground">{currentOrg.name}</SheetTitle>
                <SheetDescription>{currentOrg.cnpj ?? 'Sem CNPJ'}</SheetDescription>
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
                      value={currentOrg.plan_type}
                      onChange={(e) => handlePlanChange(currentOrg.id, e.target.value)}
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
                        used={0}
                        limit={100000}
                        format={(v) => v.toLocaleString('pt-BR')}
                      />
                      <MetricBar
                        label="Armazenamento"
                        used={0}
                        limit={10}
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
                                  checked={currentOrg[MODULE_ACCESS_MAP[m.key]] as boolean}
                                  onCheckedChange={() => handleModuleToggle(currentOrg.id, m.key)}
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
                        <p className="text-lg font-semibold text-foreground">{formatDateBR(currentOrg.subscription_valid_until)}</p>
                      </div>
                      <Badge
                        className={
                          isExpired(currentOrg.subscription_valid_until)
                            ? 'ml-auto bg-destructive/15 text-destructive border-destructive/30'
                            : 'ml-auto bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        }
                      >
                        {isExpired(currentOrg.subscription_valid_until) ? 'Vencido' : 'Ativo'}
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
                    {paymentsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : payments.length === 0 ? (
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
                            {payments.map((p) => (
                              <TableRow key={p.id} className="border-border">
                                <TableCell className="text-sm">{formatDateBR(p.payment_date)}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-sm">{p.period_added}</TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                                    Pago
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.recorder_name}</TableCell>
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
              Registre um pagamento para {currentOrg?.name}.
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
            <Button onClick={handleSavePayment} disabled={registerPayment.isPending}>
              {registerPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
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
