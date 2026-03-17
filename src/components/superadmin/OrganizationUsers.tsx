import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users as UsersIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  ativo: boolean;
  ai_enabled?: boolean;
  created_at: string;
}

interface Props {
  organizationId: string;
  users: User[];
}

export function OrganizationUsers({ organizationId, users }: Props) {
  const [aiStates, setAiStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(users.map(u => [u.id, u.ai_enabled ?? true]))
  );

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      corretor: { label: 'Corretor', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      produtor: { label: 'Produtor', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      assistente: { label: 'Assistente', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    };
    const config = roleMap[role] || { label: role, className: 'bg-muted text-muted-foreground' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleToggleAi = async (userId: string, newValue: boolean) => {
    setAiStates(prev => ({ ...prev, [userId]: newValue }));

    const { error } = await supabase
      .from('profiles')
      .update({ ai_enabled: newValue } as any)
      .eq('id', userId);

    if (error) {
      setAiStates(prev => ({ ...prev, [userId]: !newValue }));
      toast.error('Erro ao atualizar status da IA');
    } else {
      toast.success(`IA ${newValue ? 'ativada' : 'desativada'} com sucesso`);
    }
  };

  return (
    <div className="glass-component p-0 shadow-lg border-border bg-card">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UsersIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Usuários da Organização</h3>
            <p className="text-sm text-muted-foreground">Lista de todos os usuários vinculados a esta organização</p>
          </div>
        </div>
      </div>
      <div className="p-0">
        {users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">IA</TableHead>
                <TableHead className="text-muted-foreground">Cadastrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{user.nome_completo}</TableCell>
                  <TableCell className="text-foreground">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Badge className={user.ativo
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                    }>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={aiStates[user.id] ?? true}
                      onCheckedChange={(val) => handleToggleAi(user.id, val)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum usuário encontrado nesta organização</p>
          </div>
        )}
      </div>
    </div>
  );
}
