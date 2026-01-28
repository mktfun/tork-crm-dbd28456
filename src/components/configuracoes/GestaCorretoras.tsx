import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useSupabaseBrokerages } from '@/hooks/useSupabaseBrokerages';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

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
      console.log('📝 Form submitted with data:', data);
      if (editingBrokerage) {
        console.log('✏️ Updating existing brokerage:', editingBrokerage.id);
        await updateBrokerage(editingBrokerage.id, data);
      } else {
        console.log('➕ Creating new brokerage');
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
    console.log('✏️ Starting edit for brokerage:', brokerage);
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
      console.log('🗑️ UI: Starting delete process for brokerage ID:', id);
      await deleteBrokerage(id);
      console.log('✅ UI: Delete process completed successfully');
    } catch (error) {
      console.error('❌ UI: Error deleting brokerage:', error);
    }
  };

  const handleNewBrokerage = () => {
    console.log('➕ Opening new brokerage dialog');
    setEditingBrokerage(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const headerActions = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleNewBrokerage} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Corretora
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingBrokerage ? 'Editar Corretora' : 'Nova Corretora'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-300">Nome da Corretora</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Ex: Corretora XYZ Ltda"
              className="bg-slate-800 border-slate-700 text-white"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-400 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="cnpj" className="text-slate-300">CNPJ</Label>
            <Input
              id="cnpj"
              {...form.register('cnpj')}
              placeholder="00.000.000/0000-00"
              className="bg-slate-800 border-slate-700 text-white font-mono"
            />
          </div>
          <div>
            <Label htmlFor="susep_code" className="text-slate-300">Código SUSEP</Label>
            <Input
              id="susep_code"
              {...form.register('susep_code')}
              placeholder="Ex: 10.123456.7"
              className="bg-slate-800 border-slate-700 text-white font-mono"
            />
          </div>
          <div>
            <Label htmlFor="logo_url" className="text-slate-300">URL do Logo</Label>
            <Input
              id="logo_url"
              {...form.register('logo_url')}
              placeholder="https://exemplo.com/logo.png"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Separator className="my-4 bg-slate-700" />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-200">Configurações do Portal do Cliente</h4>
            
            <Controller
              name="portal_allow_policy_download"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="portal_allow_policy_download" className="text-slate-300 cursor-pointer">
                    Permitir download de apólices no portal
                  </Label>
                  <Switch
                    id="portal_allow_policy_download"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <Controller
              name="portal_allow_card_download"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="portal_allow_card_download" className="text-slate-300 cursor-pointer">
                    Permitir download de carteirinhas no portal
                  </Label>
                  <Switch
                    id="portal_allow_card_download"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <Controller
              name="portal_allow_profile_edit"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="portal_allow_profile_edit" className="text-slate-300 cursor-pointer">
                    Permitir edição de perfil pelo cliente
                  </Label>
                  <Switch
                    id="portal_allow_profile_edit"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isAdding || isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingBrokerage ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  console.log('🖥️ Rendering GestaoCorretoras with:', {
    brokerage_count: brokerages.length,
    loading,
    isDeleting
  });

  return (
    <SettingsPanel
      title="Minhas Corretoras"
      description="Gerencie as empresas e corretoras que você representa no sistema"
      icon={Building2}
      headerActions={headerActions}
    >
      {loading ? (
        <div className="text-center py-8">
          <div className="text-slate-400">Carregando...</div>
        </div>
      ) : brokerages.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p>Nenhuma corretora cadastrada ainda.</p>
          <p className="text-sm mt-1">Clique em "Adicionar Corretora" para começar.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-white">Nome da Corretora</TableHead>
              <TableHead className="text-white">CNPJ</TableHead>
              <TableHead className="text-white">SUSEP</TableHead>
              <TableHead className="text-right text-white">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brokerages.map((brokerage) => (
              <TableRow key={brokerage.id} className="border-b-slate-800 hover:bg-slate-800/30">
                <TableCell className="font-medium text-slate-200">{brokerage.name}</TableCell>
                <TableCell className="text-slate-300 font-mono">{brokerage.cnpj || '-'}</TableCell>
                <TableCell className="text-slate-300 font-mono">{brokerage.susep_code || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(brokerage)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Tem certeza que deseja excluir a corretora "{brokerage.name}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              console.log('🗑️ Alert: User confirmed deletion of brokerage:', brokerage.id);
                              handleDelete(brokerage.id);
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SettingsPanel>
  );
}
