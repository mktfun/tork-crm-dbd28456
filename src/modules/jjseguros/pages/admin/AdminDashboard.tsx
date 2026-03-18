import { useEffect, useState } from 'react';
import { AdminLayout } from '@/modules/jjseguros/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/jjseguros/components/ui/card';
import { Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';
import { Skeleton } from '@/modules/jjseguros/components/ui/skeleton';

interface Stats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: leads, error } = await supabase
          .from('leads')
          .select('rd_station_synced, rd_station_error');

        if (error) throw error;

        const total = leads?.length || 0;
        const synced = leads?.filter(l => l.rd_station_synced && !l.rd_station_error).length || 0;
        const failed = leads?.filter(l => l.rd_station_error).length || 0;
        const pending = leads?.filter(l => !l.rd_station_synced && !l.rd_station_error).length || 0;

        setStats({ total, synced, pending, failed });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Leads',
      value: stats?.total ?? 0,
      icon: Users,
      description: 'Leads cadastrados',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Sincronizados',
      value: stats?.synced ?? 0,
      icon: CheckCircle,
      description: 'Enviados ao RD Station',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pendentes',
      value: stats?.pending ?? 0,
      icon: Clock,
      description: 'Aguardando sincronização',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Com Erro',
      value: stats?.failed ?? 0,
      icon: AlertCircle,
      description: 'Falha na sincronização',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Painel Administrativo</CardTitle>
            <CardDescription>
              Gerencie leads, monitore integrações e acompanhe o status das sincronizações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Leads:</strong> Visualize todos os leads recebidos e seus status de sincronização.
              </p>
              <p>
                <strong>Logs:</strong> Acompanhe os logs de integração com RD Station e n8n.
              </p>
              <p>
                <strong>Configurações:</strong> Gerencie as configurações do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
