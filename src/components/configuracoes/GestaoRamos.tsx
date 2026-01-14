import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react';
import { useSupabaseRamos, useCreateRamo, useUpdateRamo, useDeleteRamo } from '@/hooks/useSupabaseRamos';
import { toast } from 'sonner';

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

  if (isLoading) {
    return (
      <AppCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Gestão de Ramos</h2>
          <p className="text-sm text-slate-400 mt-2">
            Gerencie os ramos de seguros oferecidos pelas seguradoras
          </p>
        </div>

        {/* Formulário para criar novo ramo */}
        <form onSubmit={handleCreate} className="flex gap-3">
          <div className="flex-1">
            <Input
              value={newRamo}
              onChange={(e) => setNewRamo(e.target.value)}
              placeholder="Nome do novo ramo (ex: Auto, Residencial, Empresarial...)"
              className="bg-slate-800 border-slate-700 text-white"
              disabled={createRamo.isPending}
            />
          </div>
          <Button
            type="submit"
            disabled={!newRamo.trim() || createRamo.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </form>

        {/* Lista de ramos */}
        <div className="space-y-3">
          {ramos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>Nenhum ramo cadastrado ainda.</p>
              <p className="text-sm">Adicione o primeiro ramo usando o formulário acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 mb-4">
                Ramos cadastrados ({ramos.length})
              </h4>
              {ramos.map((ramo: any) => (
                <div
                  key={ramo.id}
                  className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg"
                >
                  {editingRamo === ramo.id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editingName.trim() || updateRamo.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={updateRamo.isPending}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                          {ramo.nome}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Criado em {new Date(ramo.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(ramo)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRamo(ramo.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900"
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

        {/* Informações sobre a normalização */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">📋 Sobre os Ramos</h4>
          <div className="text-sm text-blue-300 space-y-1">
            <p>• Os ramos representam os tipos de seguros que as seguradoras oferecem</p>
            <p>• Após criar os ramos, associe-os às seguradoras na "Gestão de Seguradoras"</p>
            <p>• Os ramos antigos das apólices foram normalizados automaticamente</p>
          </div>
        </div>
      </div>
    </AppCard>
  );
}