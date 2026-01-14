import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ClientOption {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface ClientSearchComboboxProps {
  clients: ClientOption[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientSearchCombobox({
  clients,
  value,
  onValueChange,
  isLoading = false,
  placeholder = "Buscar cliente...",
  disabled = false,
}: ClientSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  // Get selected client info
  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === value);
  }, [clients, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando clientes...
            </span>
          ) : selectedClient ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedClient.name}</span>
              {selectedClient.phone && (
                <span className="text-xs text-muted-foreground truncate">
                  • {selectedClient.phone}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome, telefone ou email..." />
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="py-6 text-center text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.name} ${client.phone || ''} ${client.email || ''}`}
                      onSelect={() => {
                        onValueChange(client.id === value ? '' : client.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === client.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{client.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {client.phone && <span>{client.phone}</span>}
                          {client.phone && client.email && <span>•</span>}
                          {client.email && <span className="truncate">{client.email}</span>}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
