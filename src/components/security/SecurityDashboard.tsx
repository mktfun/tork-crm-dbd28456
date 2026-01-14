
import React from 'react';
import { useRoleAudit } from '@/hooks/useRoleAudit';
import { AppCard } from '@/components/ui/app-card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SecurityDashboard() {
  const { auditLogs, loading, error, canViewAudit } = useRoleAudit();

  if (!canViewAudit) {
    return (
      <AppCard>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Painel de Segurança
          </CardTitle>
          <CardDescription>
            Acesso restrito a administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mr-2" />
            Você não tem permissão para acessar este painel
          </div>
        </CardContent>
      </AppCard>
    );
  }

  if (loading) {
    return (
      <AppCard>
        <CardHeader>
          <CardTitle className="text-white">Carregando dados de segurança...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard>
        <CardHeader>
          <CardTitle className="text-white text-red-400">Erro ao carregar dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não foi possível carregar os logs de auditoria de segurança.
          </p>
        </CardContent>
      </AppCard>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'corretor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'assistente':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      corretor: 'Corretor',
      assistente: 'Assistente'
    };
    return labels[role] || role;
  };

  return (
    <AppCard>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Auditoria de Mudanças de Função
        </CardTitle>
        <CardDescription>
          Registro de todas as alterações de função de usuários
        </CardDescription>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Clock className="h-8 w-8 mr-2" />
            Nenhuma mudança de função registrada
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-slate-700 rounded-lg p-4 bg-slate-800/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">
                        {log.user_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getRoleBadgeColor(log.old_role)}>
                          {getRoleLabel(log.old_role)}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={getRoleBadgeColor(log.new_role)}>
                          {getRoleLabel(log.new_role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Alterado por: {log.changed_by_name}
                      </p>
                      {log.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Motivo: {log.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.changed_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.changed_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </AppCard>
  );
}
