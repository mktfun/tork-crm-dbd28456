import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  const handleNewClient = () => {
    navigate('/dashboard/clients');
    console.log('Abrir modal de novo cliente');
  };

  const handleNewPolicy = () => {
    navigate('/dashboard/policies');
    console.log('Abrir modal de nova apólice');
  };

  const handleNewAppointment = () => {
    navigate('/dashboard/appointments');
    console.log('Abrir modal de novo agendamento');
  };

  const handleNewQuote = () => {
    console.log('Abrir modal de nova cotação');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="
            bg-foreground/10 hover:bg-foreground/20 border border-foreground/20 text-foreground 
            h-8 w-8 p-0 md:h-9 md:w-9
          "
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-popover/95 backdrop-blur-lg border-border text-popover-foreground z-50"
      >
        <DropdownMenuLabel className="text-muted-foreground">
          Ações Rápidas
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={handleNewClient}
          className="hover:bg-muted focus:bg-muted cursor-pointer"
        >
          Novo Cliente
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleNewQuote}
          className="hover:bg-muted focus:bg-muted cursor-pointer"
        >
          Nova Cotação
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleNewPolicy}
          className="hover:bg-muted focus:bg-muted cursor-pointer"
        >
          Nova Apólice
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={handleNewAppointment}
          className="hover:bg-muted focus:bg-muted cursor-pointer"
        >
          Novo Agendamento
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
