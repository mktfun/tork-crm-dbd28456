
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { AvailableField, ColumnMapping, AVAILABLE_FIELDS, AUTO_MAPPING_RULES } from './types';
import { ColumnValidator } from './ColumnValidator';

interface ColumnMappingTableProps {
  csvHeaders: string[];
  csvData: any[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
}

export function ColumnMappingTable({ csvHeaders, csvData, onMappingChange }: ColumnMappingTableProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Inicializar mapeamentos
  useEffect(() => {
    const initialMappings: ColumnMapping[] = csvHeaders.map(header => {
      const sampleValue = csvData[0]?.[header] || '';
      const autoMappedField = detectAutoMapping(header);
      const field = AVAILABLE_FIELDS.find(f => f.id === autoMappedField);
      
      let isValid = true;
      let issues: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';
      
      if (field) {
        const validationResult = ColumnValidator.validateValue(sampleValue, field);
        isValid = validationResult.isValid;
        issues = validationResult.issues;
        status = validationResult.status;
      }

      return {
        csvColumn: header,
        systemField: autoMappedField,
        isValid,
        sampleValue,
        ignored: false,
        issues,
        validationStatus: status
      };
    });

    setMappings(initialMappings);
  }, [csvHeaders, csvData]);

  // Detectar mapeamento automático
  const detectAutoMapping = (csvColumn: string): string | null => {
    const normalizedColumn = csvColumn.toLowerCase().trim();
    
    for (const [fieldId, patterns] of Object.entries(AUTO_MAPPING_RULES)) {
      if (patterns.some(pattern => normalizedColumn.includes(pattern))) {
        return fieldId;
      }
    }
    return null;
  };

  // Atualizar mapeamento
  const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };

    // Revalidar se o campo foi alterado
    if (updates.systemField !== undefined) {
      const field = AVAILABLE_FIELDS.find(f => f.id === updates.systemField);
      if (field) {
        const validationResult = ColumnValidator.validateValue(newMappings[index].sampleValue, field);
        newMappings[index].isValid = validationResult.isValid;
        newMappings[index].issues = validationResult.issues;
        newMappings[index].validationStatus = validationResult.status;
      }
    }

    setMappings(newMappings);
    onMappingChange(newMappings);
  };

  // Alternar ignorar coluna
  const toggleIgnore = (index: number) => {
    updateMapping(index, { ignored: !mappings[index].ignored });
  };

  // Preparar opções do combobox
  const getFieldOptions = () => {
    const usedFields = mappings
      .filter(m => m.systemField && !m.ignored)
      .map(m => m.systemField);

    return AVAILABLE_FIELDS.map(field => ({
      value: field.id,
      label: `${field.label} ${field.category === 'cliente' ? '👤' : '📅'}${field.required ? ' *' : ''}`,
      disabled: usedFields.includes(field.id)
    }));
  };

  const getStatusIcon = (mapping: ColumnMapping) => {
    if (mapping.ignored) return <EyeOff className="w-4 h-4 text-gray-400" />;
    
    switch (mapping.validationStatus) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg">
      <h3 className="font-semibold mb-4 text-white">🎯 Mapeamento de Colunas</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left p-3 text-white/80">Status</th>
              <th className="text-left p-3 text-white/80">Coluna do Arquivo</th>
              <th className="text-left p-3 text-white/80">Pré-visualização</th>
              <th className="text-left p-3 text-white/80">Campo do Sistema</th>
              <th className="text-left p-3 text-white/80">Ação</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => (
              <tr key={index} className="border-b border-white/10">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(mapping)}
                    {mapping.issues.length > 0 && (
                      <div className="text-xs text-red-300">
                        {mapping.issues[0]}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="p-3 font-medium text-white">
                  {mapping.csvColumn}
                </td>
                
                <td className="p-3">
                  <div className="max-w-32 truncate text-white/70 bg-slate-900/50 px-2 py-1 rounded text-xs">
                    {mapping.sampleValue || '-'}
                  </div>
                </td>
                
                <td className="p-3">
                  <Combobox
                    options={getFieldOptions()}
                    value={mapping.systemField || ''}
                    onValueChange={(value) => updateMapping(index, { systemField: value })}
                    placeholder="Selecionar campo..."
                    className="w-64"
                  />
                </td>
                
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleIgnore(index)}
                    className={`text-xs ${mapping.ignored ? 'text-gray-400' : 'text-white/60'}`}
                  >
                    {mapping.ignored ? 'Incluir' : 'Ignorar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-white/60">
        <div>
          {mappings.filter(m => !m.ignored && m.isValid).length} colunas válidas • 
          {mappings.filter(m => !m.ignored && !m.isValid).length} com problemas • 
          {mappings.filter(m => m.ignored).length} ignoradas
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span>Válido</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-yellow-400" />
            <span>Aviso</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-400" />
            <span>Erro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
