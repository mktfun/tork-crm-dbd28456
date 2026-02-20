
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
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <User size={20} />
        Informações Básicas
      </h2>
      
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
          {isEditing ? (
            <Input 
              value={client.name || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="text-lg text-foreground mt-1">{client.name}</p>
          )}
        </div>
        
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <Input 
                value={client.phone || ''}
                onChange={(e) => onFieldChange('phone', e.target.value)}
                className="flex-1"
              />
            ) : (
              <p className="text-lg text-foreground flex-1">{client.phone}</p>
            )}
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={onWhatsAppClick}
                className="text-green-400 hover:text-green-300 border-green-400/30"
              >
                <MessageCircle size={16} />
              </Button>
            )}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
          {isEditing ? (
            <Input 
              value={client.email || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="text-lg text-foreground mt-1">{client.email}</p>
          )}
        </div>
      </div>
    </AppCard>
  );
}
