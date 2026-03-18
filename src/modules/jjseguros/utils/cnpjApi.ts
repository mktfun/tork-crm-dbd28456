export interface CNPJData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  descricao_situacao_cadastral: string;
  data_inicio_atividade: string;
  cnae_fiscal_descricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  porte: string;
  capital_social: number;
}

export interface CNPJApiResponse {
  success: boolean;
  data?: CNPJData;
  error?: string;
}

/**
 * Consulta dados de CNPJ via minhareceita.org
 * API gratuita e sem necessidade de token
 */
export async function fetchCNPJData(cnpj: string): Promise<CNPJApiResponse> {
  // Limpar CNPJ (remover pontos, barras, traços)
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    return { success: false, error: 'CNPJ inválido - deve ter 14 dígitos' };
  }

  try {
    const response = await fetch(`https://minhareceita.org/${cleanCNPJ}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'CNPJ não encontrado na base da Receita Federal' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Limite de consultas excedido. Tente novamente em alguns segundos.' };
      }
      return { success: false, error: `Erro na consulta: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cnpj: data.cnpj || cleanCNPJ,
        descricao_situacao_cadastral: data.descricao_situacao_cadastral || '',
        data_inicio_atividade: data.data_inicio_atividade || '',
        cnae_fiscal_descricao: data.cnae_fiscal_descricao || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cep: data.cep || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        porte: data.porte || '',
        capital_social: data.capital_social || 0,
      },
    };
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return { success: false, error: 'Erro de conexão. Tente novamente.' };
  }
}

/**
 * Formatar CNPJ para exibição (00.000.000/0000-00)
 */
export function formatCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

/**
 * Validar CNPJ (algoritmo completo)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false; // Todos dígitos iguais
  
  // Cálculo dos dígitos verificadores
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(clean[12]) !== digit) return false;
  
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(clean[13]) === digit;
}
