
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';
import { useSupabasePolicies } from '@/hooks/useSupabasePolicies';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseCompanyBranches } from '@/hooks/useSupabaseCompanyBranches';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// 🎯 SCHEMA ZOD RIGOROSO - OPERAÇÃO "CARTÓRIO DE REGISTRO"
const conversionSchema = z.object({
  policyNumber: z.string().min(1, 'Número da apólice é obrigatório'),
  insuranceCompany: z.string().min(1, 'Seguradora é obrigatória'),
  type: z.string().min(1, 'Ramo é obrigatório'),
});

type ConversionFormData = z.infer<typeof conversionSchema>;

interface BudgetConversionModalProps {
  budgetId: string;
  budgetDescription: string;
  onConversionSuccess?: () => void;
  children: React.ReactNode;
}

export function BudgetConversionModal({ 
  budgetId, 
  budgetDescription, 
  onConversionSuccess,
  children 
}: BudgetConversionModalProps) {
  const [open, setOpen] = useState(false);
  const { updatePolicy } = useSupabasePolicies();
  const { companies } = useSupabaseCompanies();
  const { companyBranches } = useSupabaseCompanyBranches();
  const { toast } = useToast();

  const form = useForm<ConversionFormData>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      policyNumber: '',
      insuranceCompany: '',
      type: '',
    },
  });

  // Watch insuranceCompany to filter branches
  const selectedInsuranceCompany = form.watch('insuranceCompany');

  // Filter branches based on selected company
  const filteredBranches = companyBranches.filter(branch => {
    const company = companies.find(c => c.name === selectedInsuranceCompany);
    return company ? branch.companyId === company.id : false;
  });

  // Reset type field when insurance company changes
  useEffect(() => {
    if (selectedInsuranceCompany) {
      form.setValue('type', '');
    }
  }, [selectedInsuranceCompany, form]);

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const onSubmit = async (data: ConversionFormData) => {
    try {
      // 🎯 CONVERSÃO CORRIGIDA - Agora vai para "Aguardando Apólice" primeiro
      await updatePolicy(budgetId, {
        policyNumber: data.policyNumber,
        insuranceCompany: data.insuranceCompany,
        type: data.type,
        status: 'Aguardando Apólice', // 🔥 WORKFLOW CORRETO: Orçamento → Aguardando Apólice
      });

      toast({
        title: "Sucesso!",
        description: "Orçamento convertido! Agora aguarda anexo da apólice para ativação.",
      });

      form.reset();
      handleClose();
      onConversionSuccess?.();
    } catch (error) {
      console.error('Erro ao converter orçamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível converter o orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            Converter Orçamento em Apólice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Convertendo orçamento:
            </p>
            <p className="font-medium">{budgetDescription}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Preencha todas as informações obrigatórias. Após a conversão, a apólice ficará "Aguardando Apólice" até o anexo do PDF.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="policyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Apólice *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o número da apólice" 
                          {...field} 
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insuranceCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seguradora *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a seguradora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.name}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ramo *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedInsuranceCompany}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              selectedInsuranceCompany 
                                ? "Selecione o ramo" 
                                : "Primeiro selecione uma seguradora"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.name}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedInsuranceCompany && filteredBranches.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum ramo cadastrado para esta seguradora
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.formState.isSubmitting ? 'Convertendo...' : 'Converter para Aguardando Apólice'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
