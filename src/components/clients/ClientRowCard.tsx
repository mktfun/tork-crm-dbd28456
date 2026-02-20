import { Client } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isToday } from 'date-fns';
import { Cake, Mail, Phone, FileText, Calendar } from 'lucide-react';

interface ClientRowCardProps {
  client: Client & {
    apolices_ativas_count?: number;
    comissao_total_ativas?: number;
  };
  onClick: () => void;
}

export function ClientRowCard({
  client,
  onClick
}: ClientRowCardProps) {
  const isBirthday = client.birthDate && isToday(new Date(client.birthDate));

  return (
    <div
      className="bg-card border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Linha 1: Nome, badges e botão */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate max-w-[300px]">
            {client.name}
          </h3>
          <Badge 
            className={client.status === 'Ativo' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}
          >
            {client.status}
          </Badge>
          {isBirthday && (
            <Badge className="bg-pink-600 text-white animate-pulse">
              <Cake className="w-3 h-3 mr-1" />
              Aniversário hoje!
            </Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-shrink-0"
        >
          Ver Detalhes
        </Button>
      </div>

      {/* Linha 2: Grid de informações com truncate */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-3 text-sm mb-4">
        {/* Email - 2 colunas */}
        <div className="md:col-span-2 min-w-0">
          <p className="text-muted-foreground text-xs mb-1">Email</p>
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate" title={client.email || '-'}>
              {client.email || '-'}
            </span>
          </div>
        </div>

        {/* Telefone */}
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs mb-1">Telefone</p>
          <div className="flex items-center gap-2 min-w-0">
            <Phone size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate" title={client.phone || '-'}>
              {client.phone || '-'}
            </span>
          </div>
        </div>

        {/* CPF/CNPJ */}
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs mb-1">CPF/CNPJ</p>
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate" title={client.cpfCnpj || '-'}>
              {client.cpfCnpj || '-'}
            </span>
          </div>
        </div>

        {/* Cliente desde */}
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs mb-1">Cliente desde</p>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">
              {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Linha 3: Métricas */}
      <div className="border-t border-border pt-4 flex gap-6">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Apólices Ativas</p>
          <p className="text-foreground font-semibold text-lg">
            {client.apolices_ativas_count || 0}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Comissão Total (Ativas)</p>
          <p className="text-green-400 font-semibold text-lg">
            {(client.comissao_total_ativas || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
