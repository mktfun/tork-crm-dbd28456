import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

    const config = roleMap[role] || { label: role, className: 'bg-zinc-700 text-zinc-400' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Usuários da Organização
        </CardTitle>
        <CardDescription>Lista de todos os usuários vinculados a esta organização</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Função</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Cadastrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-zinc-100">{user.nome_completo}</TableCell>
                  <TableCell className="text-zinc-300">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Badge className={user.ativo 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-zinc-700 text-zinc-400"
                    }>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300 text-sm">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-zinc-400">
            <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum usuário encontrado nesta organização</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
