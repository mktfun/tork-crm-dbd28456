
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, User } from 'lucide-react';
import { Client } from '@/types';
import { generateWhatsAppUrl } from '@/utils/whatsapp';
import { useNavigate } from 'react-router-dom';

interface ClientListViewProps {
  clients: Client[];
  getActivePoliciesCount: (clientId: string) => number;
}

export function ClientListView({ clients, getActivePoliciesCount }: ClientListViewProps) {
  const navigate = useNavigate();

  const handleWhatsAppClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `Olá ${client.name}! Como posso ajudá-lo hoje?`;
    const url = generateWhatsAppUrl(client.phone, message);
    window.open(url, '_blank');
  };

  const handleRowClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-white/5">
            <TableHead className="text-white/80 font-medium">Cliente</TableHead>
            <TableHead className="text-white/80 font-medium">Contato</TableHead>
            <TableHead className="text-white/80 font-medium">Seguros</TableHead>
            <TableHead className="text-white/80 font-medium">Status</TableHead>
            <TableHead className="text-white/80 font-medium">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="border-white/10 hover:bg-white/5 cursor-pointer"
              onClick={() => handleRowClick(client.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-400/30">
                    <User size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{client.name}</div>
                    <div className="text-sm text-white/60">{client.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-white/80">{client.phone}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-white/20 text-white/80 bg-white/10">
                  {getActivePoliciesCount(client.id)} {getActivePoliciesCount(client.id) === 1 ? 'seguro' : 'seguros'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'}>
                  {client.status || 'Ativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleWhatsAppClick(client, e)}
                  className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                >
                  <MessageCircle size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
