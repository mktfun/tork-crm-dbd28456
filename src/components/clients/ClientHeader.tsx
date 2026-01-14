
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Edit2 } from 'lucide-react';
import { Client, Policy } from '@/types';

interface ClientHeaderProps {
  client: Client;
  activePolicies: Policy[];
  isEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ClientHeader({
  client,
  activePolicies,
  isEditing,
  onBack,
  onEdit,
  onSave,
  onCancel
}: ClientHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <User size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{client.name}</h1>
            <Badge variant="outline" className="mt-1">
              {activePolicies.length} {activePolicies.length === 1 ? 'seguro ativo' : 'seguros ativos'}
            </Badge>
          </div>
        </div>
      </div>
      
      {isEditing ? (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Salvar Alterações
          </Button>
        </div>
      ) : (
        <Button onClick={onEdit} className="flex items-center gap-2">
          <Edit2 size={16} />
          Editar Cliente
        </Button>
      )}
    </div>
  );
}
