import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useSupabaseBrokerages } from '@/hooks/useSupabaseBrokerages';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const brokerageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  susep_code: z.string().optional(),
  logo_url: z.string().optional(),
  portal_allow_policy_download: z.boolean().optional(),
  portal_allow_card_download: z.boolean().optional(),
  portal_allow_profile_edit: z.boolean().optional(),
});

type BrokerageFormData = z.infer<typeof brokerageSchema>;

export function GestaoCorretoras() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrokerage, setEditingBrokerage] = useState<any>(null);
  const { brokerages, loading, addBrokerage, updateBrokerage, deleteBrokerage, isAdding, isUpdating, isDeleting } = useSupabaseBrokerages();

  const form = useForm<BrokerageFormData>({
    resolver: zodResolver(brokerageSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      susep_code: '',
      logo_url: '',
      portal_allow_policy_download: false,
      portal_allow_card_download: false,
      portal_allow_profile_edit: false,
    },
  });

  const handleSubmit = async (data: BrokerageFormData) => {
    try {
      if (editingBrokerage) {
        await updateBrokerage(editingBrokerage.id, data);
      } else {
        await addBrokerage(data);
      }
      setIsDialogOpen(false);
      setEditingBrokerage(null);
      form.reset();
    } catch (error) {
      console.error('❌ Error saving brokerage:', error);
    }
  };

  const handleEdit = (brokerage: any) => {
    setEditingBrokerage(brokerage);
    form.reset({
      name: brokerage.name || '',
      cnpj: brokerage.cnpj || '',
      susep_code: brokerage.susep_code || '',
      logo_url: brokerage.logo_url || '',
      portal_allow_policy_download: brokerage.portal_allow_policy_download ?? false,
      portal_allow_card_download: brokerage.portal_allow_card_download ?? false,
      portal_allow_profile_edit: brokerage.portal_allow_profile_edit ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBrokerage(id);
    } catch (error) {
      console.error('❌ UI: Error deleting brokerage:', error);
    }
  };

  const handleNewBrokerage = () => {
    setEditingBrokerage(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando dados...</div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Corretoras</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as empresas e corretoras ativas no sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewBrokerage} size="sm" className="rounded-full px-4 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-white/10 rounded-2xl max-w-lg p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {editingBrokerage ? 'Editar Corretora' : 'Nova Corretora'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Informações Básicas</h3>

                <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="name" className="text-muted-foreground w-1/3 text-left">Nome da Corretora *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Ex: Corretora Maga"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                    />
                  </div>
                  {form.formState.errors.name && <p className="text-xs text-destructive px-4 py-2 bg-destructive/10">{form.formState.errors.name.message}</p>}

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="cnpj" className="text-muted-foreground w-1/3 text-left">CNPJ</Label>
                    <Input
                      id="cnpj"
                      {...form.register('cnpj')}
                      placeholder="00.000.000/0000-00"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground font-mono"
                    />
                  </div>

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="susep_code" className="text-muted-foreground w-1/3 text-left">SUSEP</Label>
                    <Input
                      id="susep_code"
                      {...form.register('susep_code')}
                      placeholder="10.123456.7"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground font-mono"
                    />
                  </div>

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="logo_url" className="text-muted-foreground w-1/3 text-left">Link da Logo</Label>
                    <Input
                      id="logo_url"
                      {...form.register('logo_url')}
                      placeholder="https://..."
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Portal do Cliente */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Permissões do Portal do Cliente</h3>

                <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  <Controller
                    name="portal_allow_policy_download"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between px-4 py-3">
                        <Label htmlFor="portal_allow_policy_download" className="text-foreground cursor-pointer font-normal">
                          Permitir baixar apólices
                        </Label>
                        <Switch id="portal_allow_policy_download" checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />

                  <Controller
                    name="portal_allow_card_download"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between px-4 py-3">
                        <Label htmlFor="portal_allow_card_download" className="text-foreground cursor-pointer font-normal">
                          Permitir baixar carteirinhas
                        </Label>
                        <Switch id="portal_allow_card_download" checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />

                  <Controller
                    name="portal_allow_profile_edit"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between px-4 py-3">
                        <Label htmlFor="portal_allow_profile_edit" className="text-foreground cursor-pointer font-normal">
                          Permitir edição de perfil
                        </Label>
                        <Switch id="portal_allow_profile_edit" checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-full">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding || isUpdating} className="rounded-full px-6 bg-primary text-primary-foreground">
                  {isAdding || isUpdating ? 'Aguarde...' : editingBrokerage ? 'Salvar Edição' : 'Concluir Criação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {brokerages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Building2 className="w-16 h-16 opacity-20 mb-4" />
            <p>Nenhuma corretora cadastrada</p>
          </div>
        ) : (
          brokerages.map((brokerage) => (
            <div key={brokerage.id} className="group flex items-center justify-between p-4 bg-card border border-white/5 hover:border-white/10 hover:bg-white/[0.02] rounded-2xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-white/5">
                  {brokerage.logo_url ? (
                    <img src={brokerage.logo_url} alt={brokerage.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{brokerage.name}</h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-0.5 gap-2 font-mono">
                    {brokerage.cnpj && <span>CNPJ: {brokerage.cnpj}</span>}
                    {brokerage.cnpj && brokerage.susep_code && <span>•</span>}
                    {brokerage.susep_code && <span>SUSEP: {brokerage.susep_code}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-white/5" onClick={() => handleEdit(brokerage)}>
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border border-white/10 rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        Tem certeza que deseja apagar a corretora "{brokerage.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t border-white/5 pt-4 mt-2">
                      <AlertDialogCancel className="rounded-full bg-transparent border-white/10 hover:bg-white/5 text-foreground">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(brokerage.id)} disabled={isDeleting} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
