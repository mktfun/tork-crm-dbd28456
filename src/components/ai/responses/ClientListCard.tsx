import React from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { User, Phone, Mail, FileText, Calendar, ChevronRight } from 'lucide-react';
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
  totalCount?: number;
  returnedCount?: number;
}

/**
 * ClientListCard: Exibe lista de clientes ou detalhes de um cliente específico.
 * Agora com links clicáveis e layout responsivo.
 */
export const ClientListCard: React.FC<ClientListCardProps> = ({ 
  clients, 
  type,
  totalCount,
  returnedCount 
}) => {
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
  const showPaginationHint = totalCount && returnedCount && totalCount > returnedCount;

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const isActive = status.toLowerCase().includes('ativ');
    
    return (
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs flex-shrink-0",
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
    const hasValidId = client.id && client.id.length > 0;
    
    return (
      <GlassCard className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium truncate">{name}</h4>
              {client.cpf_cnpj && (
                <p className="text-xs text-muted-foreground truncate">{client.cpf_cnpj}</p>
              )}
            </div>
          </div>
          {getStatusBadge(client.status)}
        </div>
        
        {/* Contatos - Só mostra se existirem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.birth_date && (
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <Calendar className="h-4 w-4 flex-shrink-0" />
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
                  <span className="truncate">{policy.policy_number || `Apólice ${idx + 1}`}</span>
                  <span className={cn(
                    "flex-shrink-0",
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
        
        {/* Link para detalhes completos */}
        {hasValidId && (
          <Link 
            to={`/dashboard/clients/${client.id}`}
            className="block pt-2 border-t border-white/10"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors">
              <span>Ver perfil completo</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </Link>
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
        const hasValidId = client.id && client.id.length > 0;
        
        const CardContent = (
          <GlassCard className={cn(
            "p-3 transition-all duration-200",
            hasValidId && "hover:bg-white/15 cursor-pointer group"
          )}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {phone && (
                      <span className="flex items-center gap-1 min-w-0">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{phone}</span>
                      </span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1 min-w-0 hidden sm:flex">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{client.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
	              <div className="flex items-center gap-2 flex-shrink-0">
	                {getStatusBadge(client.status)}
	                {hasValidId && (
	                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
	                )}
	              </div>
            </div>
          </GlassCard>
        );

        // Wrap with Link only if we have a valid ID
        if (hasValidId) {
          return (
            <Link 
              key={client.id} 
              to={`/dashboard/clients/${client.id}`}
              className="block rounded-xl hover:ring-1 hover:ring-primary/50 transition-all"
            >
              {CardContent}
            </Link>
          );
        }

        return <div key={idx}>{CardContent}</div>;
      })}
      
      {/* Pagination hint */}
      {showPaginationHint ? (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-muted-foreground text-center">
            Mostrando {returnedCount} de {totalCount} clientes
          </p>
          <p className="text-xs text-primary/80 text-center mt-1">
            💡 Peça "ver mais" para carregar os próximos resultados
          </p>
        </div>
      ) : clientArray.length > 10 ? (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Mostrando 10 de {clientArray.length} clientes
        </p>
      ) : null}
    </div>
  );
};

export default ClientListCard;
