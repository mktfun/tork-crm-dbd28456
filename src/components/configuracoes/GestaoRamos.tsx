import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, Check, X, ShieldAlert } from 'lucide-react';
import { useSupabaseRamos, useCreateRamo, useUpdateRamo, useDeleteRamo } from '@/hooks/useSupabaseRamos';

export function GestaoRamos() {
  const [newRamo, setNewRamo] = useState('');
  const [editingRamo, setEditingRamo] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: ramos = [], isLoading } = useSupabaseRamos();
  const createRamo = useCreateRamo();
  const updateRamo = useUpdateRamo();
  const deleteRamo = useDeleteRamo();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRamo.trim()) return;

    try {
      await createRamo.mutateAsync({ nome: newRamo.trim() });
      setNewRamo('');
    } catch (error) {
      // Error já é tratado no hook
    }
  };

  const handleStartEdit = (ramo: any) => {
    setEditingRamo(ramo.id);
    setEditingName(ramo.nome);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim() || !editingRamo) return;

    try {
      await updateRamo.mutateAsync({
        id: editingRamo,
        data: { nome: editingName.trim() }
      });
      setEditingRamo(null);
      setEditingName('');
    } catch (error) {
      // Error já é tratado no hook
    }
  };

  const handleCancelEdit = () => {
    setEditingRamo(null);
    setEditingName('');
  };

  const handleDeleteRamo = async (ramoId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este ramo? A ação não pode ser desfeita.')) {
      try {
        await deleteRamo.mutateAsync(ramoId);
      } catch (error: any) {
        // O error já é tratado no hook com toast
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando dados...</div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Ramos de Seguros</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as categorias e os ramos de seguros oferecidos
        </p>

        <form onSubmit={handleCreate} className="mt-6 flex gap-3 max-w-xl">
          <div className="flex-1 bg-background rounded-full border border-white/5 flex items-center px-4 focus-within:ring-1 focus-within:ring-primary/50 transition-all overflow-hidden">
            <Input
              value={newRamo}
              onChange={(e) => setNewRamo(e.target.value)}
              placeholder="Nome do novo ramo (ex: Seguro Auto)..."
              className="bg-transparent border-0 shadow-none focus-visible:ring-0 px-0 text-white placeholder:text-muted-foreground/50 h-10"
              disabled={createRamo.isPending}
            />
          </div>
          <Button
            type="submit"
            disabled={!newRamo.trim() || createRamo.isPending}
            className="rounded-full px-6 bg-primary text-primary-foreground min-w-[120px]"
          >
            {createRamo.isPending ? 'Criando...' : <><Plus className="w-4 h-4 mr-2" />Adicionar</>}
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {ramos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <ShieldAlert className="w-16 h-16 opacity-20 mb-4" />
            <p>Nenhum ramo cadastrado</p>
          </div>
        ) : (
          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {ramos.map((ramo: any) => (
              <div
                key={ramo.id}
                className="group flex items-center justify-between p-4 bg-transparent hover:bg-white/[0.02] transition-colors"
              >
                {editingRamo === ramo.id ? (
                  <div className="flex items-center gap-3 flex-1 h-[40px]">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-background border border-white/10 rounded-full h-8 px-4 text-white focus-visible:ring-1 w-full max-w-[300px]"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      disabled={!editingName.trim() || updateRamo.isPending}
                      className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={updateRamo.isPending}
                      className="w-8 h-8 rounded-full hover:bg-white/5"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 h-[40px]">
                      <div className="w-2 h-2 rounded-full bg-primary/50" />
                      <div>
                        <span className="font-medium text-foreground">{ramo.nome}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(ramo)}
                        className="w-8 h-8 rounded-full hover:bg-white/5"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteRamo(ramo.id)}
                        className="w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}