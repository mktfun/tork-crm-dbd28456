import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableComponentProps {
  data: any[];
  type?: string;
}

/**
 * TableComponent: Renderiza arrays de objetos em tabelas com design Liquid Glass.
 */
export const TableComponent: React.FC<TableComponentProps> = ({ data, type }) => {
  if (!data || data.length === 0) {
    return (
      <GlassCard className="p-3">
        <p className="text-sm text-muted-foreground text-center">Nenhum dado encontrado</p>
      </GlassCard>
    );
  }

  // Extrair colunas dos objetos
  const columns = Object.keys(data[0]);
  
  // Mapeamento de labels amigáveis
  const labelMap: Record<string, string> = {
    name: 'Nome',
    nome: 'Nome',
    id: 'ID',
    email: 'Email',
    phone: 'Telefone',
    status: 'Status',
    cpf_cnpj: 'CPF/CNPJ',
    policy_number: 'Nº Apólice',
    premium_value: 'Prêmio',
    expiration_date: 'Vencimento',
    start_date: 'Início',
    created_at: 'Criado em',
    updated_at: 'Atualizado',
    value: 'Valor',
    commission_rate: 'Comissão %',
  };

  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return '-';
    
    // Formatar datas
    if (key.includes('date') || key.includes('_at')) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('pt-BR');
      } catch {
        return String(value);
      }
    }
    
    // Formatar valores monetários
    if (key.includes('value') || key.includes('premium') || key.includes('amount')) {
      const num = Number(value);
      if (!isNaN(num)) {
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
    }
    
    // Formatar percentuais
    if (key.includes('rate') || key.includes('percent')) {
      const num = Number(value);
      if (!isNaN(num)) {
        return `${num.toFixed(1)}%`;
      }
    }
    
    // Objetos aninhados (como ramos, companies)
    if (typeof value === 'object') {
      return value.name || value.nome || JSON.stringify(value);
    }
    
    return String(value);
  };

  // Filtrar colunas irrelevantes (como IDs longos)
  const displayColumns = columns.filter(col => 
    !col.endsWith('_id') && col !== 'id' && col !== 'user_id'
  );

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              {displayColumns.map((col) => (
                <TableHead 
                  key={col}
                  className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {labelMap[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 20).map((row, idx) => (
              <TableRow 
                key={idx}
                className="border-white/5 hover:bg-white/5"
              >
                {displayColumns.map((col) => (
                  <TableCell 
                    key={col}
                    className={cn(
                      "text-sm py-2",
                      col === 'status' && getStatusColor(row[col])
                    )}
                  >
                    {formatValue(row[col], col)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {data.length > 20 && (
        <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-white/10">
          Mostrando 20 de {data.length} registros
        </div>
      )}
    </GlassCard>
  );
};

function getStatusColor(status: string): string {
  const statusLower = String(status).toLowerCase();
  if (statusLower.includes('ativ') || statusLower.includes('vigente') || statusLower.includes('aprovad')) {
    return 'text-green-400';
  }
  if (statusLower.includes('pendente') || statusLower.includes('aguardando')) {
    return 'text-yellow-400';
  }
  if (statusLower.includes('cancelad') || statusLower.includes('vencid') || statusLower.includes('negad')) {
    return 'text-red-400';
  }
  return '';
}

export default TableComponent;
