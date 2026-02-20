
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MessageCircle } from 'lucide-react';
import { Client } from '@/types';

interface ClientBasicInfoProps {
  client: Client;
  isEditing: boolean;
  onFieldChange: (field: keyof Client, value: any) => void;
  onWhatsAppClick: () => void;
}

export function ClientBasicInfo({
  client,
  isEditing,
  onFieldChange,
  onWhatsAppClick
}: ClientBasicInfoProps) {
  return (
    <AppCard className="p-6">
      {/* Cabeçalho do card */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <User size={18} className="text-primary" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Informações Básicas</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
          {isEditing ? (
            <Input 
              value={client.name || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="text-base font-semibold text-foreground mt-1">{client.name}</p>
          )}
        </div>
        
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</Label>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <Input 
                value={client.phone || ''}
                onChange={(e) => onFieldChange('phone', e.target.value)}
                className="flex-1"
              />
            ) : (
              <a
                href={`tel:${client.phone}`}
                className="text-base font-medium text-foreground hover:text-primary transition-colors flex-1"
              >
                {client.phone || 'Não informado'}
              </a>
            )}
            {!isEditing && client.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={onWhatsAppClick}
                className="shrink-0"
                title="Abrir WhatsApp"
              >
                <MessageCircle size={16} />
              </Button>
            )}
          </div>
        </div>
        
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
          {isEditing ? (
            <Input 
              value={client.email || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              className="mt-1"
            />
          ) : (
            <a
              href={`mailto:${client.email}`}
              className="text-base font-medium text-foreground hover:text-primary transition-colors block mt-1"
            >
              {client.email || 'Não informado'}
            </a>
          )}
        </div>
      </div>
    </AppCard>
  );
}
