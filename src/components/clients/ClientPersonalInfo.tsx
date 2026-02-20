
import { AppCard } from '@/components/ui/app-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MaskedInput } from '@/components/ui/masked-input';
import { Client } from '@/types';

interface ClientPersonalInfoProps {
  client: Client;
  isEditing: boolean;
  onFieldChange: (field: keyof Client, value: any) => void;
}

export function ClientPersonalInfo({
  client,
  isEditing,
  onFieldChange
}: ClientPersonalInfoProps) {
  return (
    <AppCard className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Informações Pessoais</h2>
      
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</Label>
          {isEditing ? (
            <MaskedInput 
              mask="999.999.999-99"
              value={client.cpfCnpj || ''}
              onChange={(e) => onFieldChange('cpfCnpj', e.target.value)}
              className="mt-1"
              placeholder="000.000.000-00"
            />
          ) : (
            <p className="text-lg text-foreground mt-1 font-mono">{client.cpfCnpj || 'Não informado'}</p>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
          {isEditing ? (
            <Input 
              type="date"
              value={client.birthDate || ''}
              onChange={(e) => onFieldChange('birthDate', e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="text-lg text-foreground mt-1">
              {client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}
            </p>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Estado Civil</Label>
          {isEditing ? (
            <Select value={client.maritalStatus || ''} onValueChange={(value) => onFieldChange('maritalStatus', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-lg text-foreground mt-1">{client.maritalStatus || 'Não informado'}</p>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Profissão</Label>
          {isEditing ? (
            <Input 
              value={client.profession || ''}
              onChange={(e) => onFieldChange('profession', e.target.value)}
              className="mt-1"
              placeholder="Ex: Engenheiro, Médico..."
            />
          ) : (
            <p className="text-lg text-foreground mt-1">{client.profession || 'Não informado'}</p>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
          {isEditing ? (
            <Select value={client.status || 'Ativo'} onValueChange={(value) => onFieldChange('status', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'} className="mt-1">
              {client.status || 'Ativo'}
            </Badge>
          )}
        </div>
      </div>
    </AppCard>
  );
}
