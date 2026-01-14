
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { SearchX, Filter } from 'lucide-react';

interface EstadoVazioProps {
  onLimparFiltros: () => void;
  temFiltrosAtivos: boolean;
}

export function EstadoVazio({ onLimparFiltros, temFiltrosAtivos }: EstadoVazioProps) {
  return (
    <AppCard className="p-12 text-center">
      <div className="flex flex-col items-center justify-center">
        <div className="p-4 bg-slate-800 rounded-full mb-4">
          <SearchX className="w-12 h-12 text-slate-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-2">
          Nenhum dado encontrado
        </h3>
        
        <p className="text-slate-400 mb-6 max-w-md">
          {temFiltrosAtivos 
            ? "A combinação de filtros selecionados não retornou nenhum resultado. Tente ajustar os critérios de busca."
            : "Não há dados disponíveis para o período selecionado. Verifique se existem apólices cadastradas."
          }
        </p>

        {temFiltrosAtivos && (
          <Button 
            onClick={onLimparFiltros}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Limpar Filtros
          </Button>
        )}
      </div>
    </AppCard>
  );
}
