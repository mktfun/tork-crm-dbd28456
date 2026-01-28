import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/policies/KpiCard';
import { 
  LayoutDashboard, 
  Cpu, 
  Building2, 
  Settings, 
  Shield, 
  Eye, 
  EyeOff,
  Users,
  Activity,
  Server,
  Brain
} from 'lucide-react';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  // Proteção: redireciona se não for admin
  useEffect(() => {
    if (!isLoading && profile?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading) {
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

  // Dados mockados para KPIs
  const mockKpis = {
    totalBrokerages: 12,
    onlineUsers: 47,
    aiRequests: 1284,
    systemStatus: 'Operacional'
  };

  // APIs mockadas
  const mockApis = [
    { name: 'OpenAI', key: 'sk-proj-****...****Xz9A', status: 'active' },
    { name: 'Mistral', key: 'mist-****...****7pQ', status: 'active' },
    { name: 'Stripe', key: 'sk_live_****...****mNp', status: 'inactive' },
  ];

  // Corretoras mockadas
  const mockBrokerages = [
    { id: 1, name: 'Seguros Brasil LTDA', users: 8, policies: 342, status: 'active' },
    { id: 2, name: 'Corretora Premium', users: 5, policies: 189, status: 'active' },
    { id: 3, name: 'Proteção Total Seguros', users: 12, policies: 567, status: 'active' },
  ];

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
            value="apis" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Cpu className="h-4 w-4" />
            APIs e IA
          </TabsTrigger>
          <TabsTrigger 
            value="clients" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
          >
            <Building2 className="h-4 w-4" />
            Clientes
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total de Corretoras"
              value={mockKpis.totalBrokerages}
              icon={Building2}
              subtitle="Ativas no sistema"
            />
            <KpiCard
              title="Usuários Online"
              value={mockKpis.onlineUsers}
              icon={Users}
              subtitle="Últimas 24h"
              variant="success"
            />
            <KpiCard
              title="Requisições de IA"
              value={mockKpis.aiRequests.toLocaleString('pt-BR')}
              icon={Brain}
              subtitle="Este mês"
            />
            <KpiCard
              title="Status do Sistema"
              value={mockKpis.systemStatus}
              icon={Activity}
              subtitle="Todos os serviços"
              variant="success"
            />
          </div>
        </TabsContent>

        {/* APIs Tab */}
        <TabsContent value="apis" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Chaves de API</CardTitle>
              <CardDescription>Gerenciamento de integrações e serviços de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockApis.map((api) => (
                  <div 
                    key={api.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-md bg-zinc-700">
                        <Cpu className="h-5 w-5 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">{api.name}</p>
                        <p className="text-sm text-zinc-500 font-mono">{api.key}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={api.status === 'active' ? 'default' : 'secondary'}
                        className={api.status === 'active' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-zinc-700 text-zinc-400'
                        }
                      >
                        {api.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <button className="p-2 hover:bg-zinc-700 rounded-md transition-colors">
                        <Eye className="h-4 w-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Corretoras Cadastradas</CardTitle>
              <CardDescription>Visão geral de todas as corretoras no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Corretora</TableHead>
                    <TableHead className="text-zinc-400">Usuários</TableHead>
                    <TableHead className="text-zinc-400">Apólices</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBrokerages.map((brokerage) => (
                    <TableRow key={brokerage.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium text-zinc-100">{brokerage.name}</TableCell>
                      <TableCell className="text-zinc-300">{brokerage.users}</TableCell>
                      <TableCell className="text-zinc-300">{brokerage.policies}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Ativo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Configurações do Sistema</CardTitle>
              <CardDescription>Controles globais de manutenção e debug</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-md bg-amber-500/20">
                    <Server className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <Label className="text-zinc-100 font-medium">Modo Manutenção</Label>
                    <p className="text-sm text-zinc-500">Desativa o acesso de usuários ao sistema</p>
                  </div>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-md bg-blue-500/20">
                    <Activity className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-zinc-100 font-medium">Log de Debug Ativo</Label>
                    <p className="text-sm text-zinc-500">Registra logs detalhados para diagnóstico</p>
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
