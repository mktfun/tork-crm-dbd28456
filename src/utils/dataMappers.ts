// ============================================================
// Data Cleaning Utilities
// ============================================================

/**
 * Cleans monetary string to number
 * Handles: "R$ 1.234,56", "1234.56", "1234,56"
 */
export function cleanMonetaryValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  
  // Remove "R$", spaces, dots (thousand separator)
  const cleaned = value
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')      // Remove dots (thousand separator in BR)
    .replace(/,/g, '.')      // Comma decimal → dot
    .replace(/[^\d.-]/g, '') // Remove non-numeric except dot and minus
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Cleans and validates date to ISO format (YYYY-MM-DD)
 * Handles: "DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"
 */
export function cleanDateValue(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  
  // Already in ISO format YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : trimmed;
  }
  
  // Format DD/MM/YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    const isoDate = `${year}-${month}-${day}`;
    const date = new Date(isoDate);
    return isNaN(date.getTime()) ? null : isoDate;
  }
  
  // Try native Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Normalize string for comparison (remove accents, lowercase, trim)
 */
export function normalizeString(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Clean phone number to digits only with optional formatting
 */
export function cleanPhoneNumber(value: string | null | undefined, format: boolean = false): string | null {
  if (!value) return null;
  
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return null;
  
  if (!format) return digits;
  
  // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return digits;
}

/**
 * Clean CPF/CNPJ to digits only with optional formatting
 */
export function cleanCpfCnpj(value: string | null | undefined, format: boolean = false): string | null {
  if (!value) return null;
  
  const digits = value.replace(/\D/g, '');
  if (digits.length < 11) return null;
  
  if (!format) return digits;
  
  // Format CPF: XXX.XXX.XXX-XX
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  // Format CNPJ: XX.XXX.XXX/XXXX-XX
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  
  return digits;
}

// ============================================================
// Data Mapping Functions
// ============================================================

// Mapeia dados de clientes do camelCase para snake_case do Supabase
export function mapClientToSupabase(data: any) {
  const mapped: any = {};
  
  // Mapeamentos específicos para a tabela clientes
  const fieldMappings: Record<string, string> = {
    name: 'name',
    email: 'email', 
    phone: 'phone',
    cpfCnpj: 'cpf_cnpj',
    birthDate: 'birth_date',
    maritalStatus: 'marital_status',
    profession: 'profession',
    status: 'status',
    cep: 'cep',
    address: 'address',
    number: 'number',
    complement: 'complement',
    neighborhood: 'neighborhood',
    city: 'city',
    state: 'state',
    observations: 'observations',
    userId: 'user_id'
  };

  // Aplica o mapeamento apenas para campos que existem nos dados
  Object.keys(data).forEach(key => {
    const mappedKey = fieldMappings[key] || key;
    const value = data[key];
    
    // Só inclui o campo se tiver valor (não vazio)
    if (value !== '' && value !== null && value !== undefined) {
      mapped[mappedKey] = value;
    }
  });

  return mapped;
}

// Mapeia dados de apólices do camelCase para snake_case do Supabase  
export function mapPolicyToSupabase(data: any) {
  const mapped: any = {};
  
  const fieldMappings: Record<string, string> = {
    policyNumber: 'policy_number',
    clientId: 'client_id',
    userId: 'user_id',
    insuranceCompany: 'insurance_company',
    premiumValue: 'premium_value',
    expirationDate: 'expiration_date',
    startDate: 'start_date',
    commissionRate: 'commission_rate',
    automaticRenewal: 'automatic_renewal',
    renewalStatus: 'renewal_status',
    bonusClass: 'bonus_class',
    insuredAsset: 'insured_asset',
    ramoId: 'ramo_id',
    producerId: 'producer_id',
    brokerageId: 'brokerage_id',
    pdfUrl: 'pdf_url',
    pdfAttachedName: 'pdf_attached_name',
    pdfAttachedData: 'pdf_attached_data'
  };

  Object.keys(data).forEach(key => {
    const mappedKey = fieldMappings[key] || key;
    const value = data[key];
    
    if (value !== '' && value !== null && value !== undefined) {
      mapped[mappedKey] = value;
    }
  });

  return mapped;
}

// Função genérica que escolhe o mapeador correto baseado na tabela
export function mapDataToSupabase(tableName: string, data: any) {
  switch (tableName) {
    case 'clientes':
      return mapClientToSupabase(data);
    case 'apolices':
      return mapPolicyToSupabase(data);
    default:
      // Para outras tabelas, retorna os dados sem mapeamento
      return data;
  }
}