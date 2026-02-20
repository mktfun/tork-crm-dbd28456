import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useAuditStats } from '@/hooks/useAuditLogs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/policies/KpiCard';
import { AppCard } from '@/components/ui/app-card';
import { ApiKeysManager } from '@/components/superadmin/ApiKeysManager';
import { AuditLogsViewer } from '@/components/superadmin/AuditLogsViewer';
import { 
  LayoutDashboard, 
  Cpu, 
  Building2, 
  Settings, 
  Shield, 
  Users,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organizations, isLoading: orgsLoading } = useOrganizations();
  const { data: apiKeys, isLoading: apiKeysLoading } = useApiKeys();
  const { data: auditStats, isLoading: auditStatsLoading } = useAuditStats();

  // Proteção: redireciona se não for admin
  useEffect(() => {
    if (!profileLoading && profile?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-zinc-800" />
        <Skeleton className="h-96 w-full bg-zinc-800" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  const isLoading = orgsLoading || apiKeysLoading || auditStatsLoading;

  // Calcular KPIs reais
  const totalOrganizations = organizations?.length || 0;
  const totalUsers = organizations?.reduce((sum, org) => sum + (org._count?.users || 0), 0) || 0;
  const totalPolicies = organizations?.reduce((sum, org) => sum + (org._count?.policies || 0), 0) || 0;
  const activeApiKeys = apiKeys?.filter(key => key.status === 'active').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <Shield className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Painel de Controle Global</h1>
          <p className="text-sm text-zinc-400">Administração centralizada do sistema Tork</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
          <TabsTrigger 
            value="dashboard" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="organizations" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Building2 className="h-4 w-4" />
            Organizações
          </TabsTrigger>
          <TabsTrigger 
            value="apis" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Cpu className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger 
            value="audit" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Activity className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 bg-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="Organizações"
                  value={totalOrganizations}
                  icon={Building2}
                  subtitle="Corretoras ativas"
                />
                <KpiCard
                  title="Usuários"
                  value={totalUsers}
                  icon={Users}
                  subtitle="Total no sistema"
                  variant="success"
                />
                <KpiCard
                  title="Apólices"
                  value={totalPolicies.toLocaleString('pt-BR')}
                  icon={Shield}
                  subtitle="Total gerenciadas"
                />
                <KpiCard
                  title="API Keys Ativas"
                  value={activeApiKeys}
                  icon={Cpu}
                  subtitle={`de ${apiKeys?.length || 0} total`}
                  variant="success"
                />
              </div>

              {/* Estatísticas de Auditoria */}
              {auditStats && (
                <div className="mt-6">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-zinc-100 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Estatísticas de Operações da IA
                      </CardTitle>
                      <CardDescription>Métricas de uso do assistente inteligente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <AppCard className="p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl cursor-pointer border-border bg-card hover:bg-secondary/70">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-foreground/10">
                              <Activity className="h-4 w-4 text-foreground" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Total</span>
                          </div>
                          <p className="text-2xl md:text-3xl font-bold text-foreground">{auditStats.total.toLocaleString('pt-BR')}</p>
                        </AppCard>
                        <AppCard className="p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl cursor-pointer border-border bg-card hover:bg-secondary/70">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-foreground/10">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Sucesso</span>
                          </div>
                          <p className="text-2xl md:text-3xl font-bold text-foreground">{auditStats.successful.toLocaleString('pt-BR')}</p>
                        </AppCard>
                        <AppCard className="p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl cursor-pointer border-border bg-card hover:bg-secondary/70">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-foreground/10">
                              <XCircle className="h-4 w-4 text-red-400" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Falhas</span>
                          </div>
                          <p className="text-2xl md:text-3xl font-bold text-foreground">{auditStats.failed.toLocaleString('pt-BR')}</p>
                        </AppCard>
                        <AppCard className="p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl cursor-pointer border-border bg-card hover:bg-secondary/70">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-foreground/10">
                              <Clock className="h-4 w-4 text-amber-400" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Últimas 24h</span>
                          </div>
                          <p className="text-2xl md:text-3xl font-bold text-foreground">{auditStats.recent24h.toLocaleString('pt-BR')}</p>
                        </AppCard>
                        <AppCard className="p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl cursor-pointer border-border bg-card hover:bg-secondary/70">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-foreground/10">
                              <Activity className="h-4 w-4 text-purple-400" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</span>
                          </div>
                          <p className="text-2xl md:text-3xl font-bold text-foreground">{auditStats.successRate.toFixed(1)}%</p>
                        </AppCard>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Organizações Cadastradas</CardTitle>
              <CardDescription>Visão geral de todas as corretoras no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 bg-zinc-800" />
                  ))}
                </div>
              ) : organizations && organizations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Organização</TableHead>
                      <TableHead className="text-zinc-400">Slug</TableHead>
                      <TableHead className="text-zinc-400">Usuários</TableHead>
                      <TableHead className="text-zinc-400">Apólices</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-100">{org.name}</TableCell>
                        <TableCell className="text-zinc-400 font-mono text-sm">{org.slug}</TableCell>
                        <TableCell className="text-zinc-300">{org._count?.users || 0}</TableCell>
                        <TableCell className="text-zinc-300">{org._count?.policies || 0}</TableCell>
                        <TableCell>
                          <Badge className={org.active 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                            : "bg-zinc-700 text-zinc-400"
                          }>
                            {org.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/superadmin/organizations/${org.id}`)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma organização cadastrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* APIs Tab */}
        <TabsContent value="apis" className="mt-6">
          <ApiKeysManager />
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-6">
          <AuditLogsViewer />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-6">
          <div className="glass-component p-0 shadow-lg border-border bg-card">
            <div className="flex flex-col space-y-1.5 p-6 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Configurações do Sistema</h3>
              <p className="text-sm text-muted-foreground">Controles globais e informações técnicas</p>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="glass-component p-4 shadow-lg border-border bg-card">
                <h3 className="text-sm font-medium text-foreground mb-2">Status do Sistema</h3>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Operacional</span>
                </div>
              </div>
              
              <div className="glass-component p-4 shadow-lg border-border bg-card">
                <h3 className="text-sm font-medium text-foreground mb-2">Versão do Sistema</h3>
                <p className="text-sm text-muted-foreground">Tork CRM v2.0.0</p>
              </div>

              <div className="glass-component p-4 shadow-lg border-border bg-card">
                <h3 className="text-sm font-medium text-foreground mb-2">Banco de Dados</h3>
                <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
