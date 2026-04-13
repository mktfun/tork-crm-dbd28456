import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Globe, LayoutGrid, Settings } from 'lucide-react';
import { useToggleModuleAccess, useUpdateBrokeragePlan } from '@/hooks/useAdminControlCenter';
import type { OrganizationDetails } from '@/hooks/useOrganizationDetails';

interface Props {
  organization: OrganizationDetails;
}

type ModuleKey = 'crm' | 'portal' | 'ia' | 'config';

const MODULE_META: { key: ModuleKey; field: keyof OrganizationDetails; label: string; icon: typeof Brain; description: string }[] = [
  { key: 'crm', field: 'has_crm_access', label: 'CRM', icon: LayoutGrid, description: 'Pipeline de vendas, negociações e gestão de leads.' },
  { key: 'portal', field: 'has_portal_access', label: 'Portal', icon: Globe, description: 'Portal do segurado para acesso a apólices e carteirinhas.' },
  { key: 'ia', field: 'has_ai_access', label: 'IA', icon: Brain, description: 'Assistente inteligente com análise de documentos e automações.' },
  { key: 'config', field: 'has_config_access', label: 'Config', icon: Settings, description: 'Configurações avançadas, integrações e personalização.' },
];

function isExpired(dateStr: string | null) {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function OrganizationPlanModules({ organization }: Props) {
  const toggleModule = useToggleModuleAccess();
  const updatePlan = useUpdateBrokeragePlan();
  const brokerageId = parseInt(organization.id);
  const expired = isExpired(organization.subscription_valid_until);

  const handleModuleToggle = (mod: ModuleKey) => {
    const field = MODULE_META.find(m => m.key === mod)!.field;
    const currentValue = organization[field] as boolean;
    toggleModule.mutate({ brokerageId, moduleKey: mod, value: !currentValue });
  };

  const handlePlanChange = (plan: string) => {
    updatePlan.mutate({ brokerageId, planType: plan });
  };

  return (
    <div className="grid gap-6">
      {/* Plan & Status */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Assinatura</CardTitle>
          <CardDescription>Plano atual e status de vencimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plano</p>
              <select
                value={organization.plan_type}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="flex h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vencimento</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{formatDateBR(organization.subscription_valid_until)}</span>
                <Badge className={expired
                  ? 'bg-destructive/15 text-destructive border-destructive/30'
                  : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                }>
                  {expired ? 'Vencido' : 'Ativo'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Métricas de Uso</CardTitle>
          <CardDescription>Consumo atual de recursos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MetricBar label="Tokens de IA utilizados" used={0} limit={100000} format={(v) => v.toLocaleString('pt-BR')} />
          <MetricBar label="Armazenamento" used={0} limit={10} format={(v) => `${v} GB`} />
        </CardContent>
      </Card>

      {/* Module Permissions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Permissões Globais</CardTitle>
          <CardDescription>Controle de acesso aos módulos do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {MODULE_META.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.key} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <Switch
                      checked={organization[m.field] as boolean}
                      onCheckedChange={() => handleModuleToggle(m.key)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBar({ label, used, limit, format: fmt }: { label: string; used: number; limit: number; format: (v: number) => string }) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{fmt(used)} / {fmt(limit)}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
