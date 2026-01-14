
import { AvailableField, ValidationResult } from './types';

export class ColumnValidator {
  static validateValue(value: string, field: AvailableField): ValidationResult {
    if (!value || value.trim() === '') {
      if (field.required) {
        return {
          isValid: false,
          issues: [`${field.label} é obrigatório`],
          status: 'error'
        };
      }
      return { isValid: true, issues: [], status: 'valid' };
    }

    const issues: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';

    switch (field.type) {
      case 'email':
        if (!this.isValidEmail(value)) {
          issues.push('Formato de e-mail inválido');
          status = 'error';
        }
        break;

      case 'phone':
        if (!this.isValidPhone(value)) {
          issues.push('Formato de telefone inválido');
          status = 'warning';
        }
        break;

      case 'date':
        const dateValidation = this.validateDate(value);
        if (!dateValidation.isValid) {
          issues.push(dateValidation.message);
          status = 'error';
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(value)) {
          issues.push(`Valor deve ser um dos: ${field.options.join(', ')}`);
          status = 'warning';
        }
        break;
    }

    return {
      isValid: status !== 'error',
      issues,
      status
    };
  }

  // Validação específica para linha inteira (verifica se tem pelo menos email OU telefone)
  static validateRowForImport(rowData: Record<string, any>, mappings: any[]): ValidationResult {
    const issues: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';

    // Verificar se tem nome
    const nameMapping = mappings.find(m => m.systemField === 'name' && !m.ignored);
    if (!nameMapping || !rowData[nameMapping.csvColumn]?.trim()) {
      issues.push('Nome é obrigatório');
      status = 'error';
    }

    // Verificar se tem pelo menos email OU telefone
    const emailMapping = mappings.find(m => m.systemField === 'email' && !m.ignored);
    const phoneMapping = mappings.find(m => m.systemField === 'phone' && !m.ignored);
    
    const hasEmail = emailMapping && rowData[emailMapping.csvColumn]?.trim();
    const hasPhone = phoneMapping && rowData[phoneMapping.csvColumn]?.trim();
    
    if (!hasEmail && !hasPhone) {
      issues.push('É obrigatório ter pelo menos email ou telefone');
      status = 'error';
    }

    return {
      isValid: status !== 'error',
      issues,
      status
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
    return phoneRegex.test(phone);
  }

  private static validateDate(dateString: string): { isValid: boolean; message: string } {
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
            // Anos 00-49 = 2000-2049, anos 50-99 = 1950-1999
            year = year <= 49 ? 2000 + year : 1900 + year;
          }
        }

        // Validar se a data é válida
        if (month < 1 || month > 12) {
          return { isValid: false, message: 'Mês inválido (deve ser 1-12)' };
        }
        
        if (day < 1 || day > 31) {
          return { isValid: false, message: 'Dia inválido (deve ser 1-31)' };
        }

        // Verificar se a data é válida no calendário
        const testDate = new Date(year, month - 1, day);
        if (testDate.getFullYear() !== year || 
            testDate.getMonth() !== month - 1 || 
            testDate.getDate() !== day) {
          return { isValid: false, message: 'Data inexistente no calendário' };
        }

        // Verificar se a data não é muito antiga ou muito futura
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 50) {
          return { isValid: false, message: `Ano deve estar entre 1900 e ${currentYear + 50}` };
        }

        return { isValid: true, message: '' };
      }
    }

    return { isValid: false, message: 'Formato de data inválido (use DD/MM/YYYY ou DD/MM/YY)' };
  }

  private static isValidDate(date: string): boolean {
    return this.validateDate(date).isValid;
  }
}
