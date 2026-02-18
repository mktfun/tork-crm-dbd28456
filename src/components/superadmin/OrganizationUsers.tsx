import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon } from 'lucide-react';

interface User {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  ativo: boolean;
  created_at: string;
}

interface Props {
  organizationId: string;
  users: User[];
}

export function OrganizationUsers({ organizationId, users }: Props) {
  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      corretor: { label: 'Corretor', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      produtor: { label: 'Produtor', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    };

    const config = roleMap[role] || { label: role, className: 'bg-muted text-muted-foreground' };
    return <Badge className={config.className}>{config.label}</Badge>;
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
                <TableHead className="text-muted-foreground">Função</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
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
