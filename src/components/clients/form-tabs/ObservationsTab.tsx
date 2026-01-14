
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ClientFormData } from '@/schemas/clientSchema';

interface ObservationsTabProps {
  form: UseFormReturn<ClientFormData>;
}

export function ObservationsTab({ form }: ObservationsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Observações</h3>
      
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Observações Gerais</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={6}
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50 resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Status do Cliente</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full h-10 px-3 py-2 border border-white/20 bg-black/20 rounded-md text-sm text-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">Resumo do Cadastro</h4>
        <div className="text-sm text-white/70 space-y-1">
          <div>Nome: {form.watch('name') || 'Não informado'}</div>
          <div>Email: {form.watch('email') || 'Não informado'}</div>
          <div>Telefone: {form.watch('phone') || 'Não informado'}</div>
          <div>CEP: {form.watch('cep') || 'Não informado'}</div>
          <div>Status: {form.watch('status')}</div>
        </div>
      </div>
    </div>
  );
}
