
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, User, Bot } from 'lucide-react';
import { Client } from '@/types';
import { generateWhatsAppUrl } from '@/utils/whatsapp';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientListViewProps {
  clients: Client[];
  getActivePoliciesCount: (clientId: string) => number;
}

export function ClientListView({ clients, getActivePoliciesCount }: ClientListViewProps) {
  const navigate = useNavigate();
  const [aiStates, setAiStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    clients.forEach(c => { initial[c.id] = c.ai_enabled ?? true; });
    return initial;
  });

  const handleWhatsAppClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `Olá ${client.name}! Como posso ajudá-lo hoje?`;
    const url = generateWhatsAppUrl(client.phone, message);
    window.open(url, '_blank');
  };

  const handleRowClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleAiToggle = async (clientId: string, newValue: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setAiStates(prev => ({ ...prev, [clientId]: newValue }));
    const { error } = await supabase
      .from('clientes')
      .update({ ai_enabled: newValue } as any)
      .eq('id', clientId);
    if (error) {
      setAiStates(prev => ({ ...prev, [clientId]: !newValue }));
      toast.error('Erro ao atualizar IA do cliente');
    } else {
      toast.success(newValue ? 'IA ativada para este cliente' : 'IA desativada para este cliente');
    }
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
            <TableHead className="text-white/80 font-medium">
              <div className="flex items-center gap-1">
                <Bot size={14} />
                IA
              </div>
            </TableHead>
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
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={aiStates[client.id] ?? true}
                    onCheckedChange={(val) => handleAiToggle(client.id, val, { stopPropagation: () => {} } as any)}
                  />
                </div>
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
