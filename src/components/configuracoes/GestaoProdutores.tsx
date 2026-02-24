import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { useSupabaseBrokerages } from '@/hooks/useSupabaseBrokerages';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { producerSchema, ProducerFormData } from '@/schemas/producerSchema';

export function GestaoProdutores() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProducer, setEditingProducer] = useState<any>(null);
  const [cpfCnpjValue, setCpfCnpjValue] = useState('');
  const [isCnpj, setIsCnpj] = useState(false);

  const { producers, loading, addProducer, updateProducer, deleteProducer, isAdding, isUpdating, isDeleting } = useSupabaseProducers();
  const { brokerages } = useSupabaseBrokerages();

  const form = useForm<ProducerFormData>({
    resolver: zodResolver(producerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpfCnpj: '',
      companyName: '',
      brokerage_id: 0,
    },
  });

  useEffect(() => {
    const cleanValue = cpfCnpjValue.replace(/\D/g, '');
    setIsCnpj(cleanValue.length > 11);

    if (cleanValue.length <= 11 && form.getValues('companyName')) {
      form.setValue('companyName', '');
    }
  }, [cpfCnpjValue, form]);

  const handleSubmit = async (data: ProducerFormData) => {
    try {
      const submitData = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        cpfCnpj: data.cpfCnpj || null,
        companyName: data.companyName || null,
      };

      if (editingProducer) {
        await updateProducer(editingProducer.id, submitData);
      } else {
        await addProducer(submitData);
      }
      setIsDialogOpen(false);
      setEditingProducer(null);
      form.reset();
      setCpfCnpjValue('');
    } catch (error) {
      console.error('Error saving producer:', error);
    }
  };

  const handleEdit = (producer: any) => {
    setEditingProducer(producer);
    form.reset({
      name: producer.name || '',
      email: producer.email || '',
      phone: producer.phone || '',
      cpfCnpj: producer.cpfCnpj || '',
      companyName: producer.companyName || '',
      brokerage_id: producer.brokerage_id || 0,
    });
    setCpfCnpjValue(producer.cpfCnpj || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProducer(id);
    } catch (error) {
      console.error('Error deleting producer:', error);
    }
  };

  const handleNewProducer = () => {
    setEditingProducer(null);
    form.reset();
    setCpfCnpjValue('');
    setIsDialogOpen(true);
  };

  const getBrokerageName = (brokerageId: number) => {
    const brokerage = brokerages.find(b => b.id === brokerageId);
    return brokerage?.name || '-';
  };

  const formatCpfCnpj = (value: string | null) => {
    if (!value) return '-';
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length === 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleanValue.length === 14) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando dados...</div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Produtores</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os corretores e produtores da sua rede
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewProducer} size="sm" className="rounded-full px-4 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-white/10 rounded-2xl max-w-lg p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {editingProducer ? 'Editar Produtor' : 'Novo Produtor'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Dados do Produtor</h3>

                <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="name" className="text-muted-foreground w-1/3 text-left">Nome *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Ex: Ana Souza"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                    />
                  </div>
                  {form.formState.errors.name && <p className="text-xs text-destructive px-4 py-2 bg-destructive/10">{form.formState.errors.name.message}</p>}

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="cpfCnpj" className="text-muted-foreground w-1/3 text-left">CPF/CNPJ</Label>
                    <Controller
                      name="cpfCnpj"
                      control={form.control}
                      render={({ field }) => (
                        <MaskedInput
                          id="cpfCnpj"
                          mask={isCnpj ? "99.999.999/9999-99" : "999.999.999-99"}
                          placeholder={isCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
                          className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setCpfCnpjValue(e.target.value);
                          }}
                        />
                      )}
                    />
                  </div>
                  {form.formState.errors.cpfCnpj && <p className="text-xs text-destructive px-4 py-2 bg-destructive/10">{form.formState.errors.cpfCnpj.message}</p>}

                  {isCnpj && (
                    <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                      <Label htmlFor="companyName" className="text-muted-foreground w-1/3 text-left">Razão Social *</Label>
                      <Input
                        id="companyName"
                        {...form.register('companyName')}
                        placeholder="Ana Seguros LTDA"
                        className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                      />
                    </div>
                  )}

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="email" className="text-muted-foreground w-1/3 text-left">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="email@exemplo.com"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                    />
                  </div>

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="phone" className="text-muted-foreground w-1/3 text-left">Telefone</Label>
                    <Input
                      id="phone"
                      {...form.register('phone')}
                      placeholder="(11) 99999-9999"
                      className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground"
                    />
                  </div>

                  <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Label htmlFor="brokerage_id" className="text-muted-foreground w-1/3 text-left">Corretora Vinculada</Label>
                    <Controller
                      name="brokerage_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value ? field.value.toString() : ''} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger className="border-0 bg-transparent text-right shadow-none focus:ring-0 px-0 flex-1 text-foreground border-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 justify-end h-auto m-0 p-0 !outline-none">
                            <div className="mr-2">{getBrokerageName(field.value) !== '-' ? getBrokerageName(field.value) : <span className="text-muted-foreground">Selecione...</span>}</div>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/10 text-foreground">
                            {brokerages.map((brokerage) => (
                              <SelectItem key={brokerage.id} value={brokerage.id.toString()}>
                                {brokerage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-full">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding || isUpdating} className="rounded-full px-6 bg-primary text-primary-foreground">
                  {isAdding || isUpdating ? 'Aguarde...' : editingProducer ? 'Salvar Edição' : 'Concluir Criação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {producers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Users className="w-16 h-16 opacity-20 mb-4" />
            <p>Nenhum produtor cadastrado</p>
          </div>
        ) : (
          producers.map((producer) => (
            <div key={producer.id} className="group flex items-center justify-between p-4 bg-card border border-white/5 hover:border-white/10 hover:bg-white/[0.02] rounded-2xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-white/5">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{producer.name}</h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-0.5 gap-2">
                    {producer.companyName && <span>{producer.companyName}</span>}
                    {producer.companyName && producer.cpfCnpj && <span>•</span>}
                    {producer.cpfCnpj && <span className="font-mono">{formatCpfCnpj(producer.cpfCnpj)}</span>}
                  </div>
                  <div className="flex items-center text-xs text-primary/80 mt-1 gap-2">
                    <span>Vínculo: {getBrokerageName(producer.brokerage_id)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-white/5" onClick={() => handleEdit(producer)}>
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
                        Tem certeza que deseja apagar o produtor "{producer.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t border-white/5 pt-4 mt-2">
                      <AlertDialogCancel className="rounded-full bg-transparent border-white/10 hover:bg-white/5 text-foreground">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(producer.id)} disabled={isDeleting} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
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
