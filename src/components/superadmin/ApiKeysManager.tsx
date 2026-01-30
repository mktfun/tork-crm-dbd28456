import { useState } from 'react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cpu, Plus, Eye, EyeOff, Trash2, Edit } from 'lucide-react';

export function ApiKeysManager() {
  const { data: apiKeys, isLoading, createApiKey, updateApiKey, deleteApiKey, isCreating, isUpdating, isDeleting } = useApiKeys();
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<any>(null);
  
  const [newKey, setNewKey] = useState({
    service_name: '',
    key_value: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const handleCreate = () => {
    createApiKey(newKey);
    setNewKey({ service_name: '', key_value: '', description: '', status: 'active' });
    setIsCreateDialogOpen(false);
  };

  const handleEdit = () => {
    if (editingKey) {
      updateApiKey({
        id: editingKey.id,
        updates: {
          service_name: editingKey.service_name,
          key_value: editingKey.key_value,
          description: editingKey.description,
          status: editingKey.status,
        },
      });
      setIsEditDialogOpen(false);
      setEditingKey(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta API key?')) {
      deleteApiKey(id);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-zinc-800" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-zinc-100">Gerenciamento de API Keys</CardTitle>
            <CardDescription>Chaves de integração com serviços externos</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Criar Nova API Key</DialogTitle>
                <DialogDescription>Adicione uma nova chave de integração ao sistema</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service_name" className="text-zinc-300">Nome do Serviço</Label>
                  <Input
                    id="service_name"
                    placeholder="Ex: OpenAI, Mistral, Stripe"
                    value={newKey.service_name}
                    onChange={(e) => setNewKey({ ...newKey, service_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="key_value" className="text-zinc-300">Chave da API</Label>
                  <Input
                    id="key_value"
                    type="password"
                    placeholder="sk-..."
                    value={newKey.key_value}
                    onChange={(e) => setNewKey({ ...newKey, key_value: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-zinc-300">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Para que serve esta key..."
                    value={newKey.description}
                    onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-zinc-300">Status</Label>
                  <Select value={newKey.status} onValueChange={(value: 'active' | 'inactive') => setNewKey({ ...newKey, status: value })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={isCreating || !newKey.service_name || !newKey.key_value}>
                  {isCreating ? 'Criando...' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div 
                key={key.id}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-md bg-zinc-700">
                    <Cpu className="h-5 w-5 text-zinc-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-zinc-100">{key.service_name}</p>
                      <Badge 
                        variant={key.status === 'active' ? 'default' : 'secondary'}
                        className={key.status === 'active' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-zinc-700 text-zinc-400'
                        }
                      >
                        {key.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500 font-mono">
                      {showKey[key.id] ? key.key_value : maskKey(key.key_value)}
                    </p>
                    {key.description && (
                      <p className="text-xs text-zinc-400 mt-1">{key.description}</p>
                    )}
                    {key.last_used_at && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Último uso: {new Date(key.last_used_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingKey(key);
                      setIsEditDialogOpen(true);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    disabled={isDeleting}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400">
            <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma API key cadastrada</p>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      {editingKey && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Editar API Key</DialogTitle>
              <DialogDescription>Atualize as informações da chave</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_service_name" className="text-zinc-300">Nome do Serviço</Label>
                <Input
                  id="edit_service_name"
                  value={editingKey.service_name}
                  onChange={(e) => setEditingKey({ ...editingKey, service_name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="edit_key_value" className="text-zinc-300">Chave da API</Label>
                <Input
                  id="edit_key_value"
                  type="password"
                  value={editingKey.key_value}
                  onChange={(e) => setEditingKey({ ...editingKey, key_value: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="edit_description" className="text-zinc-300">Descrição</Label>
                <Input
                  id="edit_description"
                  value={editingKey.description || ''}
                  onChange={(e) => setEditingKey({ ...editingKey, description: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="edit_status" className="text-zinc-300">Status</Label>
                <Select value={editingKey.status} onValueChange={(value: 'active' | 'inactive') => setEditingKey({ ...editingKey, status: value })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
