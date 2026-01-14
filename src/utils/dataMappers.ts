// Mapeia dados de clientes do camelCase para snake_case do Supabase
export function mapClientToSupabase(data: any) {
  const mapped: any = {};
  
  // Mapeamentos específicos para a tabela clientes
  const fieldMappings = {
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
  
  const fieldMappings = {
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