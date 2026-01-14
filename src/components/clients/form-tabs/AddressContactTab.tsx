
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { ClientFormData } from '@/schemas/clientSchema';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface AddressContactTabProps {
  form: UseFormReturn<ClientFormData>;
}

export function AddressContactTab({ form }: AddressContactTabProps) {
  const { lookupCep, isLoading } = useCepLookup();
  const cepValue = form.watch('cep');

  // *** AQUI ESTÁ A MÁGICA ***
  // Cria uma versão "calma" do CEP, que só atualiza 500ms depois que o usuário parou de digitar
  const debouncedCepValue = useDebounce(cepValue, 500);

  // Memoizar a função setValue para evitar dependências desnecessárias
  const setValue = useCallback((field: keyof ClientFormData, value: string) => {
    form.setValue(field, value);
  }, [form]);

  useEffect(() => {
    const unmaskedCep = debouncedCepValue?.replace(/\D/g, '');
    
    if (unmaskedCep?.length === 8) {
      console.log(`Buscando endereço para o CEP (sem loop): ${unmaskedCep}`);
      lookupCep(unmaskedCep).then(data => {
        if (data) {
          setValue('address', data.logradouro || '');
          setValue('neighborhood', data.bairro || '');
          setValue('city', data.localidade || '');
          setValue('state', data.uf || '');
          
          // Focar no campo número após preenchimento automático
          setTimeout(() => {
            const numberField = document.querySelector('input[name="number"]') as HTMLInputElement;
            numberField?.focus();
          }, 100);
        }
      });
    }
  }, [debouncedCepValue, lookupCep, setValue]); // Agora com dependências estáveis

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Endereço</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">CEP</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MaskedInput
                      {...field}
                      mask="99999-999"
                      placeholder="00000-000"
                      className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                      disabled={isLoading}
                    />
                    {isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-white/50" />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Logradouro</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Rua, Avenida..."
                    className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Número</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="123"
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="complement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Complemento</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Apto, Bloco..."
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="neighborhood"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Bairro</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Centro, Vila..."
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Cidade</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="São Paulo"
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">UF</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="SP"
                  maxLength={2}
                  className="bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

      </div>
    </div>
  );
}
