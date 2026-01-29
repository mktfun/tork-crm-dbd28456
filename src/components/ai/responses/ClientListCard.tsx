import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { User, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id?: string;
  name?: string;
  nome?: string;
  email?: string;
  phone?: string;
  telefone?: string;
  cpf_cnpj?: string;
  status?: string;
  created_at?: string;
  birth_date?: string;
  // Campos aninhados quando vem de get_client_details
  policies?: any[];
}

interface ClientListCardProps {
  clients: Client | Client[];
  type?: string;
}

/**
 * ClientListCard: Exibe lista de clientes ou detalhes de um cliente específico.
 */
export const ClientListCard: React.FC<ClientListCardProps> = ({ clients, type }) => {
  // Normalizar para array
  const clientArray = Array.isArray(clients) ? clients : [clients];
  
  if (!clientArray || clientArray.length === 0) {
    return (
      <GlassCard className="p-3">
        <p className="text-sm text-muted-foreground text-center">Nenhum cliente encontrado</p>
      </GlassCard>
    );
  }

  const isDetails = type === 'client_details';

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const isActive = status.toLowerCase().includes('ativ');
    
    return (
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs",
        isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      )}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Detalhes de um cliente específico
  if (isDetails && clientArray.length === 1) {
    const client = clientArray[0];
    const name = client.name || client.nome;
    const phone = client.phone || client.telefone;
    
    return (
      <GlassCard className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{name}</h4>
              {client.cpf_cnpj && (
                <p className="text-xs text-muted-foreground">{client.cpf_cnpj}</p>
              )}
            </div>
          </div>
          {getStatusBadge(client.status)}
        </div>
        
        {/* Contatos */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.birth_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Nasc: {formatDate(client.birth_date)}</span>
            </div>
          )}
        </div>
        
        {/* Apólices se disponíveis */}
        {client.policies && client.policies.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <FileText className="h-3 w-3" />
              <span>{client.policies.length} apólice(s)</span>
            </div>
            <div className="space-y-1">
              {client.policies.slice(0, 3).map((policy: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white/5 rounded px-2 py-1">
                  <span>{policy.policy_number || `Apólice ${idx + 1}`}</span>
                  <span className={cn(
                    policy.status?.toLowerCase().includes('ativ') ? 'text-green-400' : 'text-muted-foreground'
                  )}>
                    {policy.status}
                  </span>
                </div>
              ))}
              {client.policies.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{client.policies.length - 3} mais
                </p>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  // Lista de clientes
  return (
    <div className="space-y-2">
      {clientArray.slice(0, 10).map((client, idx) => {
        const name = client.name || client.nome;
        const phone = client.phone || client.telefone;
        
        return (
          <GlassCard key={client.id || idx} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {phone}
                      </span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {getStatusBadge(client.status)}
            </div>
          </GlassCard>
        );
      })}
      
      {clientArray.length > 10 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Mostrando 10 de {clientArray.length} clientes
        </p>
      )}
    </div>
  );
};

export default ClientListCard;
