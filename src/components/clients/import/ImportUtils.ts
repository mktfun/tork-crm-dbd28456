
import { ColumnMapping } from './types';

export interface RowValidationResult {
  isValid: boolean;
  canCreateClient: boolean;
  canCreateAppointment: boolean;
  issues: string[];
}

export function validateImportRow(row: any, mappings: ColumnMapping[]): RowValidationResult {
  const issues: string[] = [];
  let canCreateClient = false;
  let canCreateAppointment = false;

  // Verificar se tem dados mínimos para criar cliente
  const nameMapping = mappings.find(m => m.systemField === 'name' && !m.ignored);
  const emailMapping = mappings.find(m => m.systemField === 'email' && !m.ignored);
  const phoneMapping = mappings.find(m => m.systemField === 'phone' && !m.ignored);

  const hasName = nameMapping && row[nameMapping.csvColumn]?.trim();
  const hasEmail = emailMapping && row[emailMapping.csvColumn]?.trim();
  const hasPhone = phoneMapping && row[phoneMapping.csvColumn]?.trim();

  // Para criar cliente: precisa de nome E (email OU telefone)
  if (hasName && (hasEmail || hasPhone)) {
    canCreateClient = true;
  } else {
    if (!hasName) issues.push('Nome ausente');
    if (!hasEmail && !hasPhone) issues.push('Email e telefone ausentes');
  }

  // Para criar agendamento: precisa de pelo menos título ou data
  const appointmentTitleMapping = mappings.find(m => m.systemField === 'appointmentTitle' && !m.ignored);
  const appointmentDateMapping = mappings.find(m => m.systemField === 'appointmentDate' && !m.ignored);

  const hasAppointmentTitle = appointmentTitleMapping && row[appointmentTitleMapping.csvColumn]?.trim();
  const hasAppointmentDate = appointmentDateMapping && row[appointmentDateMapping.csvColumn]?.trim();

  if (hasAppointmentTitle || hasAppointmentDate) {
    canCreateAppointment = true;
  }

  // Linha é válida se pode criar cliente OU agendamento
  const isValid = canCreateClient || canCreateAppointment;

  return {
    isValid,
    canCreateClient,
    canCreateAppointment,
    issues
  };
}

export function filterValidRows(csvData: any[], mappings: ColumnMapping[]): {
  validRows: any[];
  invalidRows: any[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    canCreateClient: number;
    canCreateAppointmentOnly: number;
  };
} {
  const validRows: any[] = [];
  const invalidRows: any[] = [];
  let canCreateClientCount = 0;
  let canCreateAppointmentOnlyCount = 0;

  csvData.forEach(row => {
    const validation = validateImportRow(row, mappings);
    
    if (validation.isValid) {
      validRows.push({ ...row, _validation: validation });
      
      if (validation.canCreateClient) {
        canCreateClientCount++;
      } else if (validation.canCreateAppointment) {
        canCreateAppointmentOnlyCount++;
      }
    } else {
      invalidRows.push({ ...row, _validation: validation });
    }
  });

  return {
    validRows,
    invalidRows,
    stats: {
      total: csvData.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      canCreateClient: canCreateClientCount,
      canCreateAppointmentOnly: canCreateAppointmentOnlyCount
    }
  };
}

export function validateDate(dateString: string): { isValid: boolean; parsedDate?: Date; message?: string } {
  if (!dateString || typeof dateString !== 'string') {
    return { isValid: false, message: 'Data vazia ou inválida' };
  }

  const trimmedDate = dateString.trim();
  
  // Tentar diferentes formatos de data
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD-MM-YY
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
    // YYYY-MM-DD (formato ISO)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = trimmedDate.match(format);
    if (match) {
      let day: number, month: number, year: number;
      
      // Determinar a ordem baseada no formato
      if (format.source.startsWith('^(\\d{4})')) {
        // Formato YYYY-MM-DD
        [, year, month, day] = match.map(Number);
      } else {
        // Formatos DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD-MM-YY
        [, day, month, year] = match.map(Number);
        
        // Converter anos de 2 dígitos para 4 dígitos
        if (year < 100) {
          year = year <= 49 ? 2000 + year : 1900 + year;
        }
      }

      // Validar se a data é válida
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        continue;
      }

      // Verificar se a data é válida no calendário
      const testDate = new Date(year, month - 1, day);
      if (testDate.getFullYear() !== year || 
          testDate.getMonth() !== month - 1 || 
          testDate.getDate() !== day) {
        continue;
      }

      return { isValid: true, parsedDate: testDate };
    }
  }

  return { isValid: false, message: 'Formato de data inválido' };
}
