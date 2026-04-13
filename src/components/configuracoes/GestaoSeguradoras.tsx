import React, { useState } from 'react';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useCompanyRamosById, useCreateCompanyRamo, useDeleteCompanyRamo } from '@/hooks/useCompanyRamos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Building2, Edit2, Save, X, Trash2, Plus, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function GestaoSeguradoras() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingPhone, setEditingPhone] = useState<string>('');

  // Estado para criação de nova seguradora
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [selectedRamosForNewCompany, setSelectedRamosForNewCompany] = useState<string[]>([]);

  const { companies, loading: isLoading, addCompany, updateCompany, deleteCompany, isUpdating, isAdding } = useSupabaseCompanies();
  const { toast } = useToast();
  const { data: ramos = [] } = useSupabaseRamos();
  const { data: companyRamos = [] } = useCompanyRamosById(selectedCompanyId);
  const createCompanyRamo = useCreateCompanyRamo();
  const deleteCompanyRamo = useDeleteCompanyRamo();

  const handleDeleteCompany = async (companyId: string) => {
    const companyName = companies.find(c => c.id === companyId)?.name || 'Seguradora';
    if (window.confirm(`Tem certeza que deseja excluir "${companyName}"?\n\nEsta ação não pode ser desfeita.`)) {
      try {
        await deleteCompany(companyId);
        toast({ title: "Sucesso", description: `"${companyName}" foi excluída.` });
        if (selectedCompanyId === companyId) setSelectedCompanyId(null);
      } catch (error: any) {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleToggleRamo = async (ramoId: string, isCurrentlyAssociated: boolean) => {
    if (!selectedCompanyId) return;
    if (isCurrentlyAssociated) {
      await deleteCompanyRamo.mutateAsync({ companyId: selectedCompanyId, ramoId });
    } else {
      await createCompanyRamo.mutateAsync({ company_id: selectedCompanyId, ramo_id: ramoId });
    }
  };

  const handleStartEdit = (company: any) => {
    setEditingCompanyId(company.id);
    setEditingName(company.name);
    setEditingPhone(company.service_phone || '');
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setEditingName('');
    setEditingPhone('');
  };

  const handleSaveEdit = async () => {
    if (!editingCompanyId || !editingName.trim()) return;
    try {
      await updateCompany(editingCompanyId, {
        name: editingName.trim(),
        service_phone: editingPhone.trim() || null
      });
      toast({ title: "Atualizada", description: "Seguradora atualizada com sucesso." });
      handleCancelEdit();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" });
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite o nome da seguradora.", variant: "destructive" });
      return;
    }
    try {
      const newCompany = await addCompany({
        name: newCompanyName.trim(),
        service_phone: newCompanyPhone.trim() || null
      });

      if (selectedRamosForNewCompany.length > 0 && newCompany?.id) {
        for (const ramoId of selectedRamosForNewCompany) {
          await createCompanyRamo.mutateAsync({ company_id: newCompany.id, ramo_id: ramoId });
        }
      }
      toast({ title: "Sucesso", description: `Seguradora criada.` });
      setIsCreating(false);
      setNewCompanyName('');
      setNewCompanyPhone('');
      setSelectedRamosForNewCompany([]);
      if (newCompany?.id) setSelectedCompanyId(newCompany.id);
    } catch (error: any) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando dados...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Coluna Esquerda: Lista de Seguradoras */}
      <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Seguradoras</h2>
            <p className="text-sm text-muted-foreground mt-1">Parceiros e assistência 24h</p>
          </div>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)} size="sm" className="rounded-full px-4 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Nova
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isCreating && (
            <div className="bg-muted/30 rounded-2xl border border-primary/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-widest">Nova Integração</h3>

              <div className="bg-card rounded-xl overflow-hidden divide-y divide-white/5 border border-white/5">
                <div className="flex items-center px-4 py-3">
                  <Building2 className="w-4 h-4 text-muted-foreground mr-3" />
                  <span className="text-sm font-medium text-muted-foreground w-28">Nome</span>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nome da seguradora"
                    className="border-0 bg-transparent text-right shadow-none focus-visible:ring-0 px-0 flex-1"
                    autoFocus
                  />
                </div>
                <div className="flex items-center px-4 py-3">
                  <Phone className="w-4 h-4 text-muted-foreground mr-3" />
                  <span className="text-sm font-medium text-muted-foreground w-28">Atendimento</span>
                  <Input
                    value={newCompanyPhone}
                    onChange={(e) => setNewCompanyPhone(e.target.value)}
                    placeholder="Ex: 0800 123 456"
                    className="border-0 bg-transparent text-right shadow-none focus-visible:ring-0 px-0 flex-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-full">Cancelar</Button>
                <Button onClick={handleCreateCompany} disabled={isAdding || !newCompanyName.trim()} className="rounded-full px-6">
                  {isAdding ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className={`group rounded-2xl border transition-all cursor-pointer ${selectedCompanyId === company.id
                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                    : 'bg-card border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
              >
                {editingCompanyId === company.id ? (
                  <div className="p-4 space-y-3">
                    <div className="bg-background rounded-xl overflow-hidden divide-y divide-white/5 border border-white/5">
                      <div className="flex items-center px-4 py-2">
                        <span className="text-sm text-muted-foreground w-16">Nome</span>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="border-0 bg-transparent text-right shadow-none focus-visible:ring-0 px-0 flex-1"
                        />
                      </div>
                      <div className="flex items-center px-4 py-2">
                        <span className="text-sm text-muted-foreground w-16">Tel</span>
                        <Input
                          value={editingPhone}
                          onChange={(e) => setEditingPhone(e.target.value)}
                          className="border-0 bg-transparent text-right shadow-none focus-visible:ring-0 px-0 flex-1"
                          placeholder="0800..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}>Cancelar</Button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} disabled={isUpdating} className="bg-primary text-primary-foreground">
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCompanyId === company.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{company.name}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-0.5 gap-2">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {company.service_phone || 'S/ telefone'}</span>
                          <span>•</span>
                          <span>{(company as any).ramos_count || 0} ramos</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); handleStartEdit(company); }}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Ramos da Seguradora */}
      <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Ramos Cobertos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name : 'Nenhuma selecionada'}
            </p>
          </div>
          {selectedCompanyId && <Badge variant="secondary" className="rounded-full px-3">{companyRamos.length} Ativos</Badge>}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedCompanyId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Building2 className="w-16 h-16 opacity-20 mb-4" />
              <p>Selecione uma seguradora à esquerda</p>
            </div>
          ) : (
            <div className="bg-background rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {ramos.map((ramo) => {
                const isAssociated = companyRamos.some((cr: any) => cr.ramo_id === ramo.id);
                return (
                  <div key={ramo.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isAssociated ? 'bg-emerald-500' : 'bg-muted'}`} />
                      <span className={`text-sm ${isAssociated ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {ramo.nome}
                      </span>
                    </div>
                    <Switch
                      checked={isAssociated}
                      onCheckedChange={() => handleToggleRamo(ramo.id, isAssociated)}
                      disabled={createCompanyRamo.isPending || deleteCompanyRamo.isPending}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}