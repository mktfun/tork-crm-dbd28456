import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function PaginationControls({ 
  currentPage, 
  totalPages, 
  totalCount,
  onPageChange, 
  isLoading 
}: PaginationControlsProps) {
  // Não mostrar paginação se só tem 1 página ou menos
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <p className="text-sm text-slate-400">
        Total: <span className="font-semibold text-white">{totalCount}</span> apólices
      </p>

      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <span className="text-sm text-slate-300 font-medium min-w-[120px] text-center">
          Página {currentPage} de {totalPages}
        </span>

        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
