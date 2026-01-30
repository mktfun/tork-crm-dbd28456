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
import { 
  ArrowLeft,
  Building2, 
  Users,
  Shield,
  FileText,
  MessageCircle,
  Activity,
  Settings
} from 'lucide-react';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization, isLoading: orgLoading } = useOrganizationDetails(id);

  // Proteção: redireciona se não for admin
  useEffect(() => {
    if (!profileLoading && profile?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  if (profileLoading || orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-zinc-800" />
        <Skeleton className="h-96 w-full bg-zinc-800" />
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
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <Building2 className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{organization.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-zinc-400 font-mono">{organization.slug}</p>
              <Badge className={organization.active 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                : "bg-zinc-700 text-zinc-400"
              }>
                {organization.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Usuários"
          value={stats.total_users}
          icon={Users}
          subtitle={`${stats.active_users} ativos`}
          variant="success"
        />
        <KpiCard
          title="Clientes"
          value={stats.total_clients}
          icon={Users}
          subtitle="Total cadastrados"
        />
        <KpiCard
          title="Apólices"
          value={stats.total_policies}
          icon={Shield}
          subtitle={`${stats.active_policies} ativas`}
        />
        <KpiCard
          title="Deals no CRM"
          value={stats.total_deals}
          icon={FileText}
          subtitle="Pipeline ativo"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger 
            value="chat-tork" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Chat Tork
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Informações da Organização</CardTitle>
                <CardDescription>Dados cadastrais e configurações gerais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Nome</p>
                    <p className="text-zinc-100">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Slug</p>
                    <p className="text-zinc-100 font-mono text-sm">{organization.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Criado em</p>
                    <p className="text-zinc-100">
                      {new Date(organization.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Atualizado em</p>
                    <p className="text-zinc-100">
                      {new Date(organization.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Estatísticas Detalhadas</CardTitle>
                <CardDescription>Métricas de uso e performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Total de Usuários</p>
                    <p className="text-2xl font-bold text-zinc-100">{stats.total_users}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.active_users}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Clientes</p>
                    <p className="text-2xl font-bold text-zinc-100">{stats.total_clients}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Apólices Totais</p>
                    <p className="text-2xl font-bold text-zinc-100">{stats.total_policies}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Apólices Ativas</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.active_policies}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-1">Deals no CRM</p>
                    <p className="text-2xl font-bold text-zinc-100">{stats.total_deals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <OrganizationUsers organizationId={organization.id} users={organization.users} />
        </TabsContent>

        {/* Chat Tork Tab */}
        <TabsContent value="chat-tork" className="mt-6">
          <OrganizationChatTorkConfig 
            organizationId={organization.id} 
            crmSettings={organization.crm_settings}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Configurações da Organização</CardTitle>
              <CardDescription>Ajustes e preferências gerais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Configurações avançadas em desenvolvimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
