export interface QualificationResult {
  isQualified: boolean;
  disqualificationReason?: string;
}

// Legacy config (backward compatibility)
export interface QualificationConfig {
  healthAgeMax: number;
}

// Location entry for granular filtering (state or state+city)
export interface LocationEntry {
  state: string;
  city?: string; // Se vazio, aplica ao estado inteiro
}

// New granular config
export interface HealthQualificationConfig {
  ageMin: number;
  ageMax: number;
  livesMin: number;
  livesMax: number;
  acceptCPF: boolean;
  acceptCNPJ: boolean;
  cnpjMinEmployees: number;
  cpfRequireHigherEducation: boolean;
  regionMode: 'allow_all' | 'allow_list' | 'block_list';
  regionLocations: LocationEntry[]; // Substituiu regionStates
  budgetMin: number;
}

export interface HealthLeadData {
  ages: number[];
  livesCount: number;
  contractType: 'cpf' | 'cnpj';
  employeeCount?: number;
  educationLevel?: string;
  state?: string;
  city?: string; // Novo campo para cidade
  budgetPerPerson: number;
}

// Legacy interface for backward compatibility
export interface LegacyHealthLeadData {
  ages: number[];
  hasCNPJ: boolean;
  employeeCount?: number;
}

/**
 * Verifica qualificação do lead de Plano de Saúde
 * Shadow Filter - marca leads desqualificados sem mostrar ao usuário
 */
export function checkHealthQualification(
  data: HealthLeadData | LegacyHealthLeadData,
  config: HealthQualificationConfig | QualificationConfig
): QualificationResult {
  const reasons: string[] = [];
  
  // Detectar se é config antiga ou nova
  const isNewConfig = 'ageMin' in config;
  const isNewData = 'contractType' in data;
  
  if (isNewConfig && isNewData) {
    const cfg = config as HealthQualificationConfig;
    const d = data as HealthLeadData;
    
    // 1. Validar idade mínima
    if (cfg.ageMin > 0 && d.ages.some(age => age < cfg.ageMin)) {
      reasons.push(`Idade abaixo do mínimo (${cfg.ageMin} anos)`);
    }
    
    // 2. Validar idade máxima
    if (d.ages.some(age => age > cfg.ageMax)) {
      reasons.push(`Idade acima do máximo (${cfg.ageMax} anos)`);
    }
    
    // 3. Validar mínimo de vidas
    if (d.livesCount < cfg.livesMin) {
      reasons.push(`Menos de ${cfg.livesMin} vidas`);
    }
    
    // 4. Validar máximo de vidas
    if (d.livesCount > cfg.livesMax) {
      reasons.push(`Mais de ${cfg.livesMax} vidas`);
    }
    
    // 5. Validar tipo de contratação - CPF
    if (d.contractType === 'cpf' && !cfg.acceptCPF) {
      reasons.push('Não aceitamos CPF');
    }
    
    // 6. Validar tipo de contratação - CNPJ
    if (d.contractType === 'cnpj' && !cfg.acceptCNPJ) {
      reasons.push('Não aceitamos CNPJ');
    }
    
    // 7. (Removido) - O mínimo de vidas já cobre o cenário de CNPJ
    
    // 8. Validar escolaridade para CPF (se exigir ensino superior)
    if (d.contractType === 'cpf' && cfg.cpfRequireHigherEducation) {
      const higherEdu = ['superior', 'pos', 'mestrado', 'doutorado'];
      if (!d.educationLevel || !higherEdu.includes(d.educationLevel)) {
        reasons.push('Exigimos ensino superior para Pessoa Física');
      }
    }
    
    // 9. Validar região (estado + cidade)
    if (d.state && cfg.regionMode !== 'allow_all') {
      const matchesLocation = cfg.regionLocations.some(loc => {
        // Se loc.city está definido, precisa bater estado E cidade
        if (loc.city) {
          return loc.state === d.state && loc.city === d.city;
        }
        // Senão, basta bater o estado
        return loc.state === d.state;
      });
      
      if (cfg.regionMode === 'allow_list' && !matchesLocation) {
        const cityLabel = d.city ? ` - ${d.city}` : '';
        reasons.push(`Região ${d.state}${cityLabel} não atendida`);
      }
      if (cfg.regionMode === 'block_list' && matchesLocation) {
        const cityLabel = d.city ? ` - ${d.city}` : '';
        reasons.push(`Região ${d.state}${cityLabel} bloqueada`);
      }
    }
    
    // 10. Validar orçamento mínimo
    if (cfg.budgetMin > 0 && d.budgetPerPerson < cfg.budgetMin) {
      reasons.push(`Orçamento abaixo do mínimo (R$ ${cfg.budgetMin})`);
    }
    
  } else {
    // Fallback para config antiga
    const cfg = config as QualificationConfig;
    const d = data as LegacyHealthLeadData;
    
    // Regra 1: Idade máxima
    const overAgeLimit = d.ages.some(age => age > cfg.healthAgeMax);
    if (overAgeLimit) {
      reasons.push(`Idade acima do limite (${cfg.healthAgeMax} anos)`);
    }

    // Regra 2: Para CNPJ, mínimo de funcionários (se aplicável)
    if (d.hasCNPJ && d.employeeCount !== undefined && d.employeeCount < 2) {
      reasons.push('CNPJ com menos de 2 vidas');
    }
  }

  return {
    isQualified: reasons.length === 0,
    disqualificationReason: reasons.join('; ') || undefined,
  };
}

/**
 * Calcula idade a partir da data de nascimento
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Extrai idades de uma lista de pessoas com data de nascimento
 */
export function extractAges(people: Array<{ birthDate: string }>): number[] {
  return people
    .filter(p => p.birthDate)
    .map(p => calculateAge(p.birthDate));
}

/**
 * Lista de estados brasileiros
 */
export const brazilianStates = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];
