
import { CheckCircle, AlertCircle, Users, Calendar } from 'lucide-react';
import { ColumnMapping } from './types';

interface ImportPreviewProps {
  mappings: ColumnMapping[];
  csvData: any[];
  totalRows: number;
}

export function ImportPreview({ mappings, csvData, totalRows }: ImportPreviewProps) {
  const validMappings = mappings.filter(m => !m.ignored && m.isValid);
  const clientMappings = validMappings.filter(m => {
    const field = m.systemField;
    return ['name', 'email', 'phone', 'cpfCnpj', 'birthDate', 'profession', 'maritalStatus', 'cep', 'address', 'city', 'state', 'observations'].includes(field || '');
  });
  const appointmentMappings = validMappings.filter(m => {
    const field = m.systemField;
    return ['appointmentTitle', 'appointmentDate', 'appointmentTime', 'appointmentStatus'].includes(field || '');
  });

  const hasRequiredFields = validMappings.some(m => m.systemField === 'name');
  const estimatedClients = hasRequiredFields ? totalRows : 0;
  const estimatedAppointments = appointmentMappings.length > 0 ? totalRows : 0;

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg">
      <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
        📋 Preview da Importação
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Clientes */}
        <div className="bg-slate-900/50 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-white">Clientes</span>
          </div>
          <div className="text-2xl font-bold text-white">{estimatedClients}</div>
          <div className="text-xs text-white/60">
            {clientMappings.length} campos mapeados
          </div>
        </div>

        {/* Agendamentos */}
        <div className="bg-slate-900/50 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="font-medium text-white">Agendamentos</span>
          </div>
          <div className="text-2xl font-bold text-white">{estimatedAppointments}</div>
          <div className="text-xs text-white/60">
            {appointmentMappings.length} campos mapeados
          </div>
        </div>
      </div>

      {/* Campos Mapeados */}
      <div className="space-y-3">
        {clientMappings.length > 0 && (
          <div>
            <h4 className="font-medium text-white mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Campos do Cliente
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {clientMappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-slate-900/30 p-2 rounded">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-white/70">{mapping.csvColumn}</span>
                  <span className="text-white/40">→</span>
                  <span className="text-white">{mapping.systemField}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {appointmentMappings.length > 0 && (
          <div>
            <h4 className="font-medium text-white mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Campos do Agendamento
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {appointmentMappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-slate-900/30 p-2 rounded">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-white/70">{mapping.csvColumn}</span>
                  <span className="text-white/40">→</span>
                  <span className="text-white">{mapping.systemField}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Avisos */}
      {!hasRequiredFields && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Campo obrigatório não mapeado</span>
          </div>
          <div className="text-sm text-red-300 mt-1">
            O campo "Nome do Cliente" é obrigatório para importação
          </div>
        </div>
      )}
    </div>
  );
}
