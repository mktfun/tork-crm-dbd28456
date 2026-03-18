import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizationDetails } from '@/hooks/useOrganizationDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/policies/KpiCard';
import { OrganizationChatTorkConfig } from '@/components/superadmin/OrganizationChatTorkConfig';
import { OrganizationUsers } from '@/components/superadmin/OrganizationUsers';
import { OrganizationPlanModules } from '@/components/superadmin/OrganizationPlanModules';
import { OrganizationBilling } from '@/components/superadmin/OrganizationBilling';
import {
  ArrowLeft,
  Building2,
  Users,
  Shield,
  FileText,
  MessageCircle,
  Activity,
  Settings,
  CreditCard,
  LayoutGrid,
} from 'lucide-react';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization, isLoading: orgLoading } = useOrganizationDetails(id);

  useEffect(() => {
    if (!profileLoading && profile?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  if (profileLoading || orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (profile?.role !== 'admin' || !organization) {
    return null;
  }

  const stats = organization.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/superadmin')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-muted-foreground font-mono">{organization.slug}</p>
              <Badge className={organization.active
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : "bg-muted text-muted-foreground"
              }>
                {organization.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Usuários" value={stats.total_users} icon={Users} subtitle={`${stats.active_users} ativos`} variant="success" />
        <KpiCard title="Clientes" value={stats.total_clients} icon={Users} subtitle="Total cadastrados" />
        <KpiCard title="Apólices" value={stats.total_policies} icon={Shield} subtitle={`${stats.active_policies} ativas`} />
        <KpiCard title="Deals no CRM" value={stats.total_deals} icon={FileText} subtitle="Pipeline ativo" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="plan" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <LayoutGrid className="h-4 w-4" />
            Plano & Módulos
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <CreditCard className="h-4 w-4" />
            Faturamento
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="chat-tork" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <MessageCircle className="h-4 w-4" />
            Chat Tork
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground gap-2 px-4 py-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Informações da Organização</CardTitle>
                <CardDescription>Dados cadastrais e configurações gerais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nome</p>
                    <p className="text-foreground">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Slug</p>
                    <p className="text-foreground font-mono text-sm">{organization.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Criado em</p>
                    <p className="text-foreground">{new Date(organization.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Atualizado em</p>
                    <p className="text-foreground">{new Date(organization.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Estatísticas Detalhadas</CardTitle>
                <CardDescription>Métricas de uso e performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total de Usuários', value: stats.total_users },
                    { label: 'Usuários Ativos', value: stats.active_users, highlight: true },
                    { label: 'Clientes', value: stats.total_clients },
                    { label: 'Apólices Totais', value: stats.total_policies },
                    { label: 'Apólices Ativas', value: stats.active_policies, highlight: true },
                    { label: 'Deals no CRM', value: stats.total_deals },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.highlight ? 'text-emerald-500' : 'text-foreground'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <OrganizationPlanModules organization={organization} />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <OrganizationBilling organization={organization} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <OrganizationUsers organizationId={organization.id} users={organization.users} />
        </TabsContent>

        <TabsContent value="chat-tork" className="mt-6">
          <OrganizationChatTorkConfig organizationId={organization.id} crmSettings={organization.crm_settings} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configurações da Organização</CardTitle>
              <CardDescription>Ajustes e preferências gerais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">Configurações avançadas em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
