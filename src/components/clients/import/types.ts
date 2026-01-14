
export interface AvailableField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select';
  category: 'cliente' | 'agendamento';
  required: boolean;
  pattern?: RegExp;
  options?: string[];
}

export interface ColumnMapping {
  csvColumn: string;
  systemField: string | null;
  isValid: boolean;
  sampleValue: string;
  ignored: boolean;
  issues: string[];
  validationStatus: 'valid' | 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  status: 'valid' | 'warning' | 'error';
}

export const AVAILABLE_FIELDS: AvailableField[] = [
  // Campos do Cliente
  { id: 'name', label: 'Nome do Cliente', type: 'text', category: 'cliente', required: true },
  { id: 'email', label: 'E-mail', type: 'email', category: 'cliente', required: false },
  { id: 'phone', label: 'Telefone', type: 'phone', category: 'cliente', required: false },
  { id: 'cpfCnpj', label: 'CPF/CNPJ', type: 'text', category: 'cliente', required: false },
  { id: 'birthDate', label: 'Data de Nascimento', type: 'date', category: 'cliente', required: false },
  { id: 'profession', label: 'Profissão', type: 'text', category: 'cliente', required: false },
  { id: 'maritalStatus', label: 'Estado Civil', type: 'select', category: 'cliente', required: false, options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'] },
  { id: 'cep', label: 'CEP', type: 'text', category: 'cliente', required: false },
  { id: 'address', label: 'Endereço', type: 'text', category: 'cliente', required: false },
  { id: 'city', label: 'Cidade', type: 'text', category: 'cliente', required: false },
  { id: 'state', label: 'Estado', type: 'text', category: 'cliente', required: false },
  { id: 'observations', label: 'Observações', type: 'text', category: 'cliente', required: false },
  
  // Campos do Agendamento
  { id: 'appointmentTitle', label: 'Título do Agendamento', type: 'text', category: 'agendamento', required: false },
  { id: 'appointmentDate', label: 'Data de Vencimento', type: 'date', category: 'agendamento', required: false },
  { id: 'appointmentTime', label: 'Horário', type: 'text', category: 'agendamento', required: false },
  { id: 'appointmentStatus', label: 'Status do Agendamento', type: 'select', category: 'agendamento', required: false, options: ['Pendente', 'Realizado'] },
];

// Mapeamento automático baseado em similaridade
export const AUTO_MAPPING_RULES: Record<string, string[]> = {
  'name': ['cliente', 'nome', 'name', 'nome_cliente', 'client_name'],
  'email': ['email', 'e-mail', 'e_mail', 'mail'],
  'phone': ['telefone', 'phone', 'celular', 'tel', 'fone'],
  'appointmentTitle': ['produto', 'bem', 'title', 'titulo', 'bem_segurado', 'seguro'],
  'appointmentDate': ['vencimento', 'data', 'date', 'data_vencimento', 'expiration'],
  'observations': ['observações', 'observacoes', 'obs', 'observations', 'notes'],
  'cpfCnpj': ['cpf', 'cnpj', 'documento', 'doc'],
  'birthDate': ['nascimento', 'aniversario', 'birth', 'birthday'],
};

// Função para validar se uma linha tem dados suficientes para ser importada
export const validateRowData = (rowData: Record<string, any>, mappings: ColumnMapping[]): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Verificar se tem nome
  const nameMapping = mappings.find(m => m.systemField === 'name' && !m.ignored);
  if (!nameMapping || !rowData[nameMapping.csvColumn]?.trim()) {
    issues.push('Nome é obrigatório');
  }
  
  // Verificar se tem pelo menos email OU telefone
  const emailMapping = mappings.find(m => m.systemField === 'email' && !m.ignored);
  const phoneMapping = mappings.find(m => m.systemField === 'phone' && !m.ignored);
  
  const hasEmail = emailMapping && rowData[emailMapping.csvColumn]?.trim();
  const hasPhone = phoneMapping && rowData[phoneMapping.csvColumn]?.trim();
  
  if (!hasEmail && !hasPhone) {
    issues.push('É obrigatório ter pelo menos email ou telefone');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};
