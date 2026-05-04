import { supabase } from '@/integrations/supabase/client';
import { ExtractedPolicyData, PolicyImportItem, ClientReconcileStatus, ImportError } from '@/types/policyImport';
import { gerarTransacaoDeComissao } from '@/services/commissionService';
import { Policy } from '@/types';

// ============================================================
// TYPES: Policy Import Result
// ============================================================

export interface PolicyImportResult {
  success: boolean;
  policyId?: string;
  clientId?: string;
  clientCreated?: boolean;
  error?: string;
  errorCode?: string;
  commissionCreated?: boolean;
  commissionError?: string;
}

// ============================================================
// PHASE 1: Text Normalization & Fuzzy Matching Utilities
// ============================================================

/**
 * Remove acentos e normaliza string para matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Múltiplos espaços → um
    .replace(/[^\w\s]/g, '');       // Remove pontuação
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calcula similaridade entre duas strings (0-1)
 */
export function similarity(s1: string, s2: string): number {
  const a = normalizeText(s1);
  const b = normalizeText(s2);

  if (!a || !b) return 0;
  if (a === b) return 1;

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Check word-level overlap
  const wordsA = a.split(' ').filter(w => w.length > 2);
  const wordsB = b.split(' ').filter(w => w.length > 2);
  const commonWords = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  const wordOverlap = commonWords.length / Math.max(wordsA.length, wordsB.length, 1);

  if (wordOverlap >= 0.5) return 0.7 + (wordOverlap * 0.2);

  // Levenshtein distance-based similarity
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// ============================================================
// PHASE 2: CPF/CNPJ Validation & Client Type Detection
// ============================================================

export type ClientType = 'PF' | 'PJ';

/**
 * Detecta se o documento é CPF (PF) ou CNPJ (PJ)
 */
export function detectClientType(cpfCnpj: string | null): ClientType {
  if (!cpfCnpj) return 'PF';
  const digits = cpfCnpj.replace(/\D/g, '');
  return digits.length === 14 ? 'PJ' : 'PF';
}

/**
 * Valida CPF (11 dígitos)
 */
export function validaCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // Todos dígitos iguais

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(digits[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[9])) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(digits[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(digits[10]);
}

/**
 * Valida CNPJ (14 dígitos)
 */
export function validaCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // Todos dígitos iguais

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(digits[i]) * pesos1[i];
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (d1 !== parseInt(digits[12])) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(digits[i]) * pesos2[i];
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return d2 === parseInt(digits[13]);
}

/**
 * Valida CPF ou CNPJ baseado no tamanho
 */
export function validaCpfCnpj(value: string | null): { valid: boolean; type: ClientType; error?: string } {
  if (!value) return { valid: true, type: 'PF' }; // Opcional

  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) return { valid: true, type: 'PF' };

  if (digits.length === 11) {
    const isValid = validaCPF(digits);
    return {
      valid: isValid,
      type: 'PF',
      error: isValid ? undefined : `CPF inválido: ${value}`
    };
  }

  if (digits.length === 14) {
    const isValid = validaCNPJ(digits);
    return {
      valid: isValid,
      type: 'PJ',
      error: isValid ? undefined : `CNPJ inválido: ${value}`
    };
  }

  return {
    valid: false,
    type: digits.length > 11 ? 'PJ' : 'PF',
    error: `CPF/CNPJ com formato inválido (${digits.length} dígitos): ${value}`
  };
}

// ============================================================
// Original Helper Functions (Updated)
// ============================================================

// Normaliza CPF/CNPJ removendo formatação
function normalizeCpfCnpj(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[^\d]/g, '');
}

// ✅ Busca cliente por CPF/CNPJ com match EXATO (normalizado)
async function findClientByCpfCnpj(cpfCnpj: string, userId: string) {
  const normalized = normalizeCpfCnpj(cpfCnpj);
  if (!normalized || normalized.length < 11) return null;

  // Tenta busca exata primeiro (mais performático)
  const { data, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email')
    .eq('user_id', userId)
    .eq('cpf_cnpj', normalized)
    .limit(1);

  if (error) {
    console.error('Error finding client by CPF/CNPJ (exact):', error);
  }

  if (data?.[0]) {
    console.log(`✅ [CPF/CNPJ EXACT] Match encontrado: ${data[0].name}`);
    return data[0];
  }

  // Fallback: busca com pontuação comum (111.222.333-44 ou 11.222.333/0001-44)
  const formattedCpf = normalized.length === 11
    ? `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9)}`
    : null;
  const formattedCnpj = normalized.length === 14
    ? `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8, 12)}-${normalized.slice(12)}`
    : null;

  const { data: formatted, error: err2 } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email')
    .eq('user_id', userId)
    .or(`cpf_cnpj.eq.${formattedCpf || 'NULL'},cpf_cnpj.eq.${formattedCnpj || 'NULL'}`)
    .limit(1);

  if (err2) {
    console.error('Error finding client by formatted CPF/CNPJ:', err2);
  }

  if (formatted?.[0]) {
    console.log(`✅ [CPF/CNPJ FORMATTED] Match encontrado: ${formatted[0].name}`);
    return formatted[0];
  }

  return null;
}

// Busca cliente por email
async function findClientByEmail(email: string, userId: string) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email')
    .eq('user_id', userId)
    .ilike('email', email.trim())
    .limit(1);

  if (error) {
    console.error('Error finding client by email:', error);
    return null;
  }

  return data?.[0] || null;
}

// ============================================================
// v5.7: NEW - Exact Name Match (Case Insensitive)
// ============================================================

/**
 * v5.7: Busca cliente por nome EXATO (case insensitive + trim)
 * Executada ANTES do fuzzy matching para evitar duplicatas
 */
async function findClientByNameExact(name: string, userId: string) {
  if (!name || name.length < 3) return null;

  const cleanName = name.trim().replace(/\s+/g, ' ');

  const { data, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email, phone')
    .eq('user_id', userId)
    .ilike('name', cleanName)  // Case insensitive exact match
    .limit(1);

  if (error) {
    console.error('Error finding client by exact name:', error);
    return null;
  }

  if (data?.[0]) {
    console.log(`✅ [NAME EXACT v5.7] Match: "${name}" → "${data[0].name}"`);
    return data[0];
  }

  return null;
}

// ============================================================
// Fuzzy Matching for Seguradora (Insurance Company) with Aliases
// ============================================================

// Common aliases for insurance companies
const seguradoraAliases: Record<string, string[]> = {
  'porto seguro': ['porto', 'ps', 'porto seguro cia', 'porto seguro sa', 'portoseguro'],
  'bradesco': ['bradesco seguros', 'bradesco auto', 'bradesco saude'],
  'hdi': ['hdi seguros', 'hdi brasil', 'hdi seguros s a', 'hdi seguros sa'],
  'tokio marine': ['tokio', 'tokiomarine', 'tokio marine seguradora'],
  'allianz': ['allianz seguros', 'allianz brasil', 'allianz cia'],
  'sulamerica': ['sulamerica', 'sul america', 'sul-america', 'sulamérica'],
  'liberty': ['liberty seguros', 'liberty mutual'],
  'mapfre': ['mapfre seguros', 'mapfre brasil'],
  'zurich': ['zurich seguros', 'zurich brasil'],
  'azul': ['azul seguros', 'azul cia'],
  'sompo': ['sompo seguros', 'yasuda', 'marítima', 'maritima'],
  'itau': ['itau seguros', 'itaú seguros'],
  'caixa': ['caixa seguros', 'caixa seguradora'],
  'bb seguros': ['bb seguros', 'banco do brasil seguros'],
  'icatu': ['icatu seguros', 'icatu hartford'],
  'mitsui': ['mitsui sumitomo', 'mitsui'],
  'alfa': ['alfa seguros', 'alfa seguradora'],
};

export async function matchSeguradora(nome: string, userId: string): Promise<{ id: string; name: string; score: number } | null> {
  if (!nome) return null;

  const normalizedInput = normalizeText(nome);

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('user_id', userId);

  if (error || !companies || companies.length === 0) {
    console.warn('⚠️ [MATCH] Nenhuma seguradora encontrada no banco');
    return null;
  }

  // 1. Try alias match first
  for (const [canonical, aliases] of Object.entries(seguradoraAliases)) {
    const allAliases = [canonical, ...aliases];
    if (allAliases.some(a => normalizedInput.includes(normalizeText(a)) || normalizeText(a).includes(normalizedInput))) {
      // Find company that matches the canonical name
      const match = companies.find(c =>
        normalizeText(c.name).includes(normalizeText(canonical)) ||
        allAliases.some(a => normalizeText(c.name).includes(normalizeText(a)))
      );

      if (match) {
        console.log(`✅ [ALIAS] Seguradora "${nome}" → "${match.name}" (alias: ${canonical})`);
        return { ...match, score: 0.95 };
      }
    }
  }

  // 2. Score each company with fuzzy matching
  const scored = companies.map(c => ({
    ...c,
    score: similarity(nome, c.name)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Threshold of 0.5 (50% similarity)
  const THRESHOLD = 0.5;

  if (scored[0]?.score >= THRESHOLD) {
    console.log(`✅ [FUZZY] Seguradora "${nome}" → "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}%)`);
    return scored[0];
  }

  // 3. Try LIKE fallback for partial matches
  if (nome.length >= 3) {
    const { data: likeResults } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${nome.substring(0, 10)}%`)
      .limit(1);

    if (likeResults?.[0]) {
      console.log(`✅ [LIKE] Seguradora "${nome}" → "${likeResults[0].name}"`);
      return { ...likeResults[0], score: 0.6 };
    }
  }

  console.warn(`⚠️ [NO MATCH] Seguradora "${nome}" não encontrada (melhor: ${scored[0]?.name} ${(scored[0]?.score * 100).toFixed(0)}%)`);
  return null;
}

// ============================================================
// Expanded Fuzzy Matching for Ramo (Branch)
// ============================================================

// Expanded keyword mapping for ramos
const ramoKeywords: Record<string, string[]> = {
  // Automóvel
  'auto': ['auto', 'automóvel', 'automovel', 'veículo', 'veiculo', 'carro', 'moto', 'caminhao', 'caminhão', 'frota', 'pessoa física auto', 'pessoa juridica auto', 'pf auto', 'pj auto', 'auto pf', 'auto pj'],

  // Residencial  
  'residencial': ['residencial', 'residência', 'residencia', 'casa', 'apartamento', 'lar', 'moradia', 'incêndio residencial', 'incendio residencial', 'condomínio', 'condominio'],

  // Vida
  'vida': ['vida', 'vida em grupo', 'vida individual', 'ap', 'acidentes pessoais', 'invalidez', 'morte', 'funeral', 'prestamista'],

  // Empresarial
  'empresarial': ['empresarial', 'empresa', 'comercial', 'negócio', 'negocio', 'incêndio comercial', 'incendio comercial', 'pj', 'riscos nomeados', 'riscos operacionais'],

  // Saúde
  'saude': ['saúde', 'saude', 'médico', 'medico', 'dental', 'odonto', 'odontológico', 'odontologico', 'hospitalar', 'plano de saude', 'plano de saúde'],

  // Responsabilidade Civil
  'responsabilidade': ['responsabilidade', 'rc', 'civil', 'rc profissional', 'rc médico', 'rc medico', 'rc obras', 'rc geral', 'd&o', 'directors', 'officers', 'e&o'],

  // Transporte
  'transporte': ['transporte', 'carga', 'mercadoria', 'rctr-c', 'rctrc', 'cargas', 'embarcador'],

  // Garantia
  'garantia': ['garantia', 'fiança', 'fianca', 'locatícia', 'locaticia', 'fiança locatícia', 'seguro fiança', 'performance', 'judicial'],

  // Viagem
  'viagem': ['viagem', 'travel', 'internacional', 'exterior', 'turismo'],

  // Equipamentos
  'equipamentos': ['equipamentos', 'eletrônicos', 'eletronicos', 'portáteis', 'portateis', 'notebook', 'celular', 'riscos de engenharia'],

  // Consórcio
  'consorcio': ['consórcio', 'consorcio', 'carta de crédito', 'carta de credito', 'contemplado'],

  // Rural/Agrícola
  'rural': ['rural', 'agrícola', 'agricola', 'agro', 'safra', 'pecuário', 'pecuario', 'máquinas agrícolas', 'maquinas agricolas'],
};

/**
 * v7.0: Smart Ramo Matching com contexto de seguradora
 * Se não achar match global, busca ramos da mesma seguradora
 */
export async function matchRamo(
  nome: string,
  userId: string,
  seguradoraId?: string | null
): Promise<{ id: string; nome: string; score: number } | null> {
  if (!nome) return null;

  const normalizedName = normalizeText(nome);

  const { data, error } = await supabase
    .from('ramos')
    .select('id, nome, company_ramos(company_id)')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) {
    console.warn('⚠️ [MATCH] Nenhum ramo encontrado no banco');
    return null;
  }

  // First try exact match
  const exactMatch = data.find(ramo =>
    normalizeText(ramo.nome) === normalizedName
  );

  if (exactMatch) {
    console.log(`✅ [MATCH v7.0] Ramo "${nome}" → "${exactMatch.nome}" (100% - exato)`);
    return { id: exactMatch.id, nome: exactMatch.nome, score: 1 };
  }

  // Try keyword-based matching
  for (const [key, keywords] of Object.entries(ramoKeywords)) {
    // Check if input matches any keyword
    if (keywords.some(kw => normalizedName.includes(normalizeText(kw)))) {
      // Find a ramo that matches this category
      const match = data.find(ramo => {
        const ramoNorm = normalizeText(ramo.nome);
        return ramoNorm.includes(normalizeText(key)) ||
          keywords.some(kw => ramoNorm.includes(normalizeText(kw)));
      });

      if (match) {
        console.log(`✅ [MATCH v7.0] Ramo "${nome}" → "${match.nome}" (keyword: ${key})`);
        return { id: match.id, nome: match.nome, score: 0.8 };
      }
    }
  }

  // Try fuzzy matching with similarity score
  const scored = data.map(ramo => ({
    id: ramo.id,
    nome: ramo.nome,
    company_id: (ramo as any).company_ramos?.[0]?.company_id || null,
    score: similarity(nome, ramo.nome)
  }));

  scored.sort((a, b) => b.score - a.score);

  const THRESHOLD = 0.4;
  if (scored[0]?.score >= THRESHOLD) {
    console.log(`✅ [MATCH v7.0] Ramo "${nome}" → "${scored[0].nome}" (${(scored[0].score * 100).toFixed(0)}% fuzzy)`);
    return { id: scored[0].id, nome: scored[0].nome, score: scored[0].score };
  }

  // 🆕 v7.0: SMART FALLBACK - Busca ramos da mesma seguradora
  if (seguradoraId) {
    console.log(`🔍 [SMART v7.0] Buscando ramos da seguradora ${seguradoraId}...`);

    const seguradoraRamos = scored.filter(r => r.company_id === seguradoraId);

    if (seguradoraRamos.length > 0) {
      // Score ramos da seguradora
      const scoredByCia = seguradoraRamos.map(ramo => ({
        id: ramo.id,
        nome: ramo.nome,
        score: similarity(nome, ramo.nome)
      }));

      scoredByCia.sort((a, b) => b.score - a.score);

      // Threshold mais baixo para seguradora (30% vs 40%)
      const CIA_THRESHOLD = 0.3;
      if (scoredByCia[0]?.score >= CIA_THRESHOLD) {
        console.log(`✅ [SMART v7.0] Ramo via seguradora: "${nome}" → "${scoredByCia[0].nome}" (${(scoredByCia[0].score * 100).toFixed(0)}%)`);
        return scoredByCia[0];
      }

      // Se ainda não achou, retorna o primeiro ramo da seguradora como fallback
      console.log(`💡 [FALLBACK v7.0] Usando primeiro ramo da seguradora: "${seguradoraRamos[0].nome}"`);
      return { id: seguradoraRamos[0].id, nome: seguradoraRamos[0].nome, score: 0.2 };
    }
  }

  console.warn(`⚠️ [NO MATCH v7.0] Ramo "${nome}" não encontrado (melhor: ${scored[0]?.nome} ${(scored[0]?.score * 100).toFixed(0)}%)`);
  return null;
}

// ============================================================
// Client Reconciliation with Fuzzy Name Matching
// ============================================================

/**
 * Remove títulos e sufixos comuns de nomes para melhor matching
 */
function cleanNameForMatching(name: string): string {
  if (!name) return '';
  return name
    .replace(/^(dr\.?|dra\.?|sr\.?|sra\.?|prof\.?|me\.?)\s+/gi, '') // Títulos
    .replace(/\s+(junior|jr\.?|filho|neto|sobrinho|segundo|terceiro|ii|iii|iv)$/gi, '') // Sufixos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * v6.0: Find client by name with fuzzy matching (70%+ threshold - captures OCR typos)
 * Threshold reduzido de 85% para 70% para capturar variações como "barda" vs "barba"
 * Busca em até 500 clientes para garantir cobertura adequada
 */
async function findClientByNameFuzzy(name: string, userId: string) {
  if (!name || name.length < 3) return null;

  // v6.0: Limpa títulos, sufixos E sanitiza o nome antes de buscar
  const cleanedInputName = cleanNameForMatching(name);

  const { data: clients, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email')
    .eq('user_id', userId)
    .limit(500); // Aumentado para cobrir bases maiores

  if (error || !clients?.length) return null;

  // Calculate similarity for each client (usando nome limpo)
  const scored = clients.map(c => {
    const cleanedClientName = cleanNameForMatching(c.name);
    return {
      ...c,
      score: similarity(cleanedInputName, cleanedClientName)
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // ✅ v6.0: Threshold de 70% (captura variações como barda/barba, OCR typos)
  const FUZZY_THRESHOLD = 0.70;
  if (scored[0]?.score >= FUZZY_THRESHOLD) {
    console.log(`✅ [FUZZY v6.0] "${name}" → "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}%)`);
    return scored[0];
  }

  // Log para debug quando não encontra match
  if (scored[0]) {
    console.log(`⚠️ [FUZZY v6.0] "${name}" melhor match: "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}% < 70%)`);
  }

  return null;
}

// ============================================================
// v5.1: INSTITUTIONAL BLACKLIST FOR NAME VALIDATION
// ============================================================

// v5.4: Expanded institutional blacklist + marketing phrases
const INSTITUTIONAL_BLACKLIST = [
  // Seguradoras
  'SEGURADORA', 'SEGUROS', 'CORRETORA', 'CORRETAGEM', 'ESTIPULANTE',
  'TOKIO', 'MARINE', 'PORTO', 'HDI', 'LIBERTY', 'ALLIANZ', 'MAPFRE',
  'SULAMERICA', 'AZUL', 'ZURICH', 'SOMPO', 'BRADESCO', 'ITAU', 'CAIXA',
  'MITSUI', 'GENERALI', 'POTTENCIAL', 'JUNTO', 'ALFA', 'BBSEGUROS',
  // Termos jurídicos
  'LTDA', 'SA', 'EIRELI', 'ME', 'EPP', 'CIA', 'COMPANHIA',
  'CNPJ', 'INSCRICAO', 'RAZAOSOCIAL', 'FANTASIA', 'SUSEP',
  // v5.4: Termos de marketing/frases institucionais
  'AGORA', 'VOCE', 'PODE', 'REALIZAR', 'PROGRAMA', 'BENEFICIOS', 'BENEFICIO',
  'APROVEITE', 'DESCONTO', 'PROMOCAO', 'OFERTA', 'EXCLUSIVO',
  'CLIQUE', 'ACESSE', 'SAIBA', 'MAIS', 'INFORMACOES',
  'ATENDIMENTO', 'SERVICO', 'PORTAL', 'ONLINE', 'DIGITAL',
  'TERMOS', 'CONDICOES', 'REGULAMENTO', 'PARTICIPAR',
  'PAGINA', 'SITE', 'WWW', 'HTTP', 'HTTPS',
];

/**
 * v5.4: Valida se um nome é válido para cliente (não é institucional/lixo/frase)
 * Critérios rigorosos:
 * - 8+ caracteres totais
 * - 2-5 palavras (nomes reais raramente têm > 5 palavras)
 * - Palavras substanciais (3+ chars)
 * - Não contém termos da blacklist
 * - Não parece frase (poucos verbos/artigos)
 */
function isValidClientName(name: string): boolean {
  if (!name) return false;

  // Remove espaços extras
  const cleanName = name.trim().replace(/\s+/g, ' ');

  // Mínimo de 8 caracteres
  if (cleanName.length < 8) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (muito curto: ${cleanName.length} chars)`);
    return false;
  }

  const words = cleanName.split(' ');

  // v5.4: NOVO - Máximo de 5 palavras (nomes reais)
  if (words.length > 5) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (${words.length} palavras - provavelmente frase)`);
    return false;
  }

  // Mínimo de 2 palavras
  if (words.length < 2) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (apenas ${words.length} palavra)`);
    return false;
  }

  // Cada palavra deve ter pelo menos 2 chars
  const validWords = words.filter(w => w.length >= 2);
  if (validWords.length < 2) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (palavras muito curtas)`);
    return false;
  }

  // Pelo menos uma palavra com 3+ caracteres
  const hasSubstantialWord = words.some(w => w.length >= 3);
  if (!hasSubstantialWord) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (sem palavra substancial)`);
    return false;
  }

  const alphaName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Verifica blacklist expandida
  for (const forbidden of INSTITUTIONAL_BLACKLIST) {
    if (alphaName.includes(forbidden)) {
      console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (contém "${forbidden}")`);
      return false;
    }
  }

  // v5.4: NOVO - Detectar padrão de frase (verbos/artigos em excesso)
  const verbsAndArticles = ['VOCE', 'PODE', 'PARA', 'COM', 'QUE', 'COMO', 'FAZER', 'TER', 'SER', 'ESTA'];
  const wordSet = new Set(words.map(w => w.toUpperCase()));
  const matchCount = verbsAndArticles.filter(v => wordSet.has(v)).length;

  if (matchCount >= 2) {
    console.log(`🚫 [NAME v5.4] Rejeitado: "${name}" (parece frase: ${matchCount} verbos/artigos)`);
    return false;
  }

  return true;
}

/**
 * v5.1: Sanitiza nome para uso - substitui lixo por default
 */
function sanitizeClientName(nome: string | null): string {
  if (!nome) return 'Cliente Importado';
  if (!isValidClientName(nome)) return 'Cliente Importado';
  return nome;
}

/**
 * Upsert de cliente por documento (CPF/CNPJ)
 * v5.1: Valida nome e usa existente do banco se disponível
 */
/**
 * v5.5: Upsert de cliente por documento + sync de dados
 * - Cria cliente se não existe
 * - Atualiza campos vazios do cliente existente (telefone, email, endereco)
 */
export async function upsertClientByDocument(
  documento: string,
  nome: string,
  email: string | null,
  telefone: string | null,
  endereco: string | null,
  userId: string
): Promise<{ id: string; created: boolean; name: string; phone?: string; email?: string } | null> {
  const normalized = documento.replace(/\D/g, '');

  // Validação mínima: CPF (11) ou CNPJ (14)
  if (!normalized || (normalized.length !== 11 && normalized.length !== 14)) {
    console.warn(`⚠️ [UPSERT v5.5] Documento inválido: ${documento} (${normalized.length} dígitos)`);
    return null;
  }

  // 1. Busca existente pelo documento (incluindo phone, email e cpf_cnpj para sync)
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, name, phone, email, address, cpf_cnpj')
    .eq('user_id', userId)
    .eq('cpf_cnpj', normalized)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, any> = {};

    // v5.6: Valida e corrige nome se necessário
    const dbNameIsValid = isValidClientName(existing.name);
    if (!dbNameIsValid) {
      const safeName = sanitizeClientName(nome);
      if (safeName !== existing.name && safeName !== 'Cliente Importado') {
        updates.name = safeName;
      }
    }

    // v5.6: NOVO - Gravar CPF extraído se campo estiver vazio ou incompleto
    if (normalized && !existing.cpf_cnpj) {
      // Cliente existente não tinha CPF/CNPJ, agora tem!
      console.log(`📋 [SYNC v5.6] CPF/CNPJ será adicionado: ${normalized}`);
    }

    // v5.6: NOVO - Preenche campos vazios com dados do PDF
    if (telefone && !existing.phone) {
      updates.phone = telefone;
      console.log(`📱 [SYNC v5.6] Telefone adicionado: ${telefone}`);
    }
    if (email && !existing.email) {
      updates.email = email;
      console.log(`📧 [SYNC v5.6] Email adicionado: ${email}`);
    }
    if (endereco && !existing.address) {
      updates.address = endereco;
      console.log(`📍 [SYNC v5.6] Endereço adicionado`);
    }

    // Aplica atualizações se houver
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase
        .from('clientes')
        .update(updates)
        .eq('id', existing.id);

      // Log de auditoria para rastreamento
      console.table([{
        cliente_id: existing.id,
        nome: existing.name,
        campos_atualizados: Object.keys(updates).join(', '),
        origem: 'PDF Import v5.6'
      }]);
    }

    const finalName = updates.name || existing.name;
    console.log(`✅ [UPSERT v5.6] Cliente existente: ${existing.id} (${finalName})`);
    return {
      id: existing.id,
      created: false,
      name: finalName,
      phone: updates.phone || existing.phone || undefined,
      email: updates.email || existing.email || undefined,
    };
  }

  // v5.7: NÃO criar se nome é inválido - força vinculação manual
  const safeName = sanitizeClientName(nome);
  if (safeName === 'Cliente Importado' || safeName === 'Cliente Não Identificado') {
    console.warn(`🚫 [UPSERT v5.7] Bloqueando criação - nome inválido: "${nome}"`);
    return null;  // Força vinculação manual no modal
  }

  // 2. Cria novo cliente (safeName já foi calculado acima)
  // 3. Cria novo cliente
  const cep = extractCep(endereco);
  const { city, state } = extractCityState(endereco);

  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: safeName,
      cpf_cnpj: normalized,
      email: email || '',
      phone: telefone || '',
      address: endereco || '',
      cep: cep,
      city: city,
      state: state,
      status: 'Ativo',
    })
    .select('id, name, phone, email')
    .single();

  if (error) {
    // Se for erro de duplicata (unique constraint), tenta buscar novamente
    if (error.code === '23505') {
      console.log('⚠️ [UPSERT v5.5] Conflito de duplicata, buscando existente...');
      const { data: retryExisting } = await supabase
        .from('clientes')
        .select('id, name, phone, email')
        .eq('user_id', userId)
        .eq('cpf_cnpj', normalized)
        .maybeSingle();

      if (retryExisting) {
        return {
          id: retryExisting.id,
          created: false,
          name: retryExisting.name,
          phone: retryExisting.phone || undefined,
          email: retryExisting.email || undefined,
        };
      }
    }

    console.error('❌ [UPSERT v5.5] Erro ao criar cliente:', error);
    return null;
  }

  console.log(`✅ [UPSERT v5.5] Novo cliente criado: ${newClient.id} (${newClient.name})`);
  return {
    id: newClient.id,
    created: true,
    name: newClient.name,
    phone: newClient.phone || undefined,
    email: newClient.email || undefined,
  };
}

export async function reconcileClient(
  extracted: ExtractedPolicyData,
  userId: string
): Promise<{
  status: ClientReconcileStatus;
  clientId?: string;
  clientName?: string; // v5.2: Retorna nome do banco quando disponível
  matchedBy?: 'cpf_cnpj' | 'email' | 'name_fuzzy' | 'auto_created';
}> {
  const documento = extracted.cliente.cpf_cnpj;

  // 1. Primeiro tenta por CPF/CNPJ (prioridade máxima)
  if (documento) {
    const clientByCpf = await findClientByCpfCnpj(documento, userId);
    if (clientByCpf) {
      return {
        status: 'matched',
        clientId: clientByCpf.id,
        clientName: clientByCpf.name, // v5.2: Retorna nome do banco
        matchedBy: 'cpf_cnpj',
      };
    }

    // 🔥 NOVO: Se não encontrou mas tem documento válido, cria automaticamente
    const normalized = documento.replace(/\D/g, '');
    if (normalized.length === 11 || normalized.length === 14) {
      const upsertResult = await upsertClientByDocument(
        documento,
        extracted.cliente.nome_completo || 'Cliente Importado',
        extracted.cliente.email || null,
        extracted.cliente.telefone || null,
        extracted.cliente.endereco_completo || null,
        userId
      );

      if (upsertResult) {
        console.log(`✅ [RECONCILE] Cliente ${upsertResult.created ? 'criado' : 'encontrado'} via upsert`);
        return {
          status: 'matched',
          clientId: upsertResult.id,
          clientName: upsertResult.name, // v5.2: Retorna nome do banco/criado
          matchedBy: upsertResult.created ? 'auto_created' : 'cpf_cnpj',
        };
      }
    }
  }

  // 2. Depois tenta por email
  if (extracted.cliente.email) {
    const clientByEmail = await findClientByEmail(extracted.cliente.email, userId);
    if (clientByEmail) {
      return {
        status: 'matched',
        clientId: clientByEmail.id,
        clientName: clientByEmail.name,
        matchedBy: 'email',
      };
    }
  }

  // 3. NOVO v5.7: Busca por nome EXATO (case insensitive) antes do fuzzy
  if (extracted.cliente.nome_completo) {
    const clientByNameExact = await findClientByNameExact(extracted.cliente.nome_completo, userId);
    if (clientByNameExact) {
      return {
        status: 'matched',
        clientId: clientByNameExact.id,
        clientName: clientByNameExact.name,
        matchedBy: 'name_fuzzy', // Usa mesmo matchedBy para compatibilidade de tipos
      };
    }
  }

  // 3. Fuzzy name matching (85%+ threshold)
  if (extracted.cliente.nome_completo) {
    const clientByName = await findClientByNameFuzzy(extracted.cliente.nome_completo, userId);
    if (clientByName) {
      return {
        status: 'matched',
        clientId: clientByName.id,
        clientName: clientByName.name, // v5.2: Retorna nome do banco
        matchedBy: 'name_fuzzy',
      };
    }
  }

  // Não encontrou - cliente novo (sem documento válido)
  return { status: 'new' };
}

// ============================================================
// Address Extraction Helpers
// ============================================================

function extractCep(endereco: string | null | undefined): string | null {
  if (!endereco) return null;
  const match = endereco.match(/\d{5}-?\d{3}/);
  return match ? match[0].replace('-', '') : null;
}

function extractCityState(endereco: string | null | undefined): { city: string | null; state: string | null } {
  if (!endereco) return { city: null, state: null };

  const ufMatch = endereco.match(/([A-Za-zÀ-ÿ\s]+)[\s\-\/,]+([A-Z]{2})\s*(?:\d{5}|$)/i);
  if (ufMatch) {
    return {
      city: ufMatch[1].trim().substring(0, 50),
      state: ufMatch[2].toUpperCase()
    };
  }

  return { city: null, state: null };
}

// ============================================================
// Client Creation Functions
// ============================================================

export async function createClient(
  data: ExtractedPolicyData['cliente'] & { cep?: string | null },
  userId: string
): Promise<{ id: string } | null> {
  const cep = data.cep || extractCep(data.endereco_completo);
  const { city, state } = extractCityState(data.endereco_completo);

  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: data.nome_completo,
      cpf_cnpj: data.cpf_cnpj,
      email: data.email || '',
      phone: data.telefone || '',
      address: data.endereco_completo || '',
      cep: cep,
      city: city,
      state: state,
      status: 'Ativo',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating client:', error);
    return null;
  }

  return newClient;
}

/**
 * Creates client with validation for CPF/CNPJ
 * Throws ImportError if validation fails
 */
export async function createClientFromEdited(
  clientName: string,
  cpfCnpj: string | null,
  email: string | null,
  telefone: string | null,
  endereco: string | null,
  userId: string
): Promise<{ id: string }> {
  // Validate CPF/CNPJ
  const validation = validaCpfCnpj(cpfCnpj);
  if (!validation.valid && validation.error) {
    console.error('❌ [VALIDATION]', validation.error);
    throw new Error(validation.error);
  }

  const cep = extractCep(endereco);
  const { city, state } = extractCityState(endereco);

  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: clientName,
      cpf_cnpj: normalizeCpfCnpj(cpfCnpj),
      email: email || '',
      phone: telefone || '',
      address: endereco || '',
      cep: cep,
      city: city,
      state: state,
      status: 'Ativo',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating client from edited data:', error);
    throw new Error(`Falha ao criar cliente: ${error.message}`);
  }

  console.log(`✅ [CREATE] Cliente criado (${validation.type}):`, clientName, cpfCnpj);
  return newClient;
}

// ============================================================
// PDF Upload
// ============================================================

export async function uploadPolicyPdf(
  file: File,
  userId: string,
  cpfCnpj?: string,
  numeroApolice?: string,
  brokerageId?: number | string | null
): Promise<string | null> {
  const timestamp = Date.now();

  const rawCpf = cpfCnpj?.replace(/[^\d]/g, '');
  const cleanCpf = rawCpf && rawCpf.length >= 11 ? rawCpf : `novo-${timestamp}`;

  const originalName = file.name.replace(/[^\w.\-]/g, '_').substring(0, 50);

  const brokerageSegment = brokerageId ? `/${brokerageId}` : '';
  const fileName = `${userId}${brokerageSegment}/${cleanCpf}/${timestamp}_${originalName}`;

  console.log(`📁 [UPLOAD] Path: ${fileName} (userId first for RLS compliance)`);

  const { data, error } = await supabase.storage
    .from('policy-docs')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('❌ [UPLOAD] Erro no Storage:', error.message, error);
    throw new Error(`Upload do PDF falhou: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('policy-docs')
    .getPublicUrl(data.path);

  console.log('✅ [UPLOAD] PDF salvo com sucesso:', urlData.publicUrl);
  return urlData.publicUrl;
}

// ============================================================
// Validation Function
// ============================================================

export function validateImportItem(item: PolicyImportItem): string[] {
  const errors: string[] = [];

  if (!item.clientName?.trim()) {
    errors.push('Nome do cliente é obrigatório');
  }

  if (!item.numeroApolice?.trim()) {
    errors.push('Número da apólice é obrigatório');
  }

  if (!item.seguradoraId) {
    errors.push('Seguradora é obrigatória');
  }

  if (!item.ramoId) {
    errors.push('Ramo é obrigatório');
  }

  if (!item.producerId) {
    errors.push('Produtor é obrigatório');
  }

  if (item.commissionRate < 0 || item.commissionRate > 100) {
    errors.push('Taxa de comissão deve estar entre 0 e 100%');
  }

  if (!item.dataInicio) {
    errors.push('Data de início é obrigatória');
  }

  if (!item.dataFim) {
    errors.push('Data de fim é obrigatória');
  }

  if (item.premioLiquido <= 0) {
    errors.push('Prêmio líquido deve ser maior que zero');
  }

  // Validate CPF/CNPJ if provided
  if (item.clientCpfCnpj) {
    const validation = validaCpfCnpj(item.clientCpfCnpj);
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  }

  return errors;
}

// ============================================================
// PHASE 4: Create Seguradora/Ramo on-the-fly
// ============================================================

export async function createSeguradora(
  nome: string,
  userId: string
): Promise<{ id: string; name: string } | null> {
  if (!nome?.trim()) return null;

  const { data, error } = await supabase
    .from('companies')
    .insert({
      user_id: userId,
      name: nome.trim()
    })
    .select('id, name')
    .single();

  if (error) {
    console.error('❌ [CREATE] Erro ao criar seguradora:', error);
    return null;
  }

  console.log(`✅ [CREATE] Seguradora criada: ${data.name}`);
  return data;
}

export async function createRamo(
  nome: string,
  userId: string
): Promise<{ id: string; nome: string } | null> {
  if (!nome?.trim()) return null;

  const { data, error } = await supabase
    .from('ramos')
    .insert({
      user_id: userId,
      nome: nome.trim()
    })
    .select('id, nome')
    .single();

  if (error) {
    console.error('❌ [CREATE] Erro ao criar ramo:', error);
    return null;
  }

  console.log(`✅ [CREATE] Ramo criado: ${data.nome}`);
  return data;
}

// ============================================================
// PHASE 5: Salvar Itens da Apólice (Veículos, Imóveis)
// ============================================================

export interface ApoliceItem {
  tipo_item: 'VEICULO' | 'IMOVEL' | 'OUTRO';
  placa?: string;
  chassi?: string;
  modelo?: string;
  marca?: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  cep?: string;
  endereco?: string;
  dados_extras?: Record<string, unknown>;
}

/**
 * Extrai dados estruturados de veículo do texto
 */
export function extractVehicleData(objetoSegurado: string, identificacao?: string): ApoliceItem | null {
  if (!objetoSegurado) return null;

  // Regex para placas (formato antigo e Mercosul)
  const placaMatch = identificacao?.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i)
    || objetoSegurado.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);

  // Regex para chassi (17 caracteres alfanuméricos)
  const chassiMatch = objetoSegurado.match(/([A-HJ-NPR-Z0-9]{17})/i);

  // Extrai modelo (geralmente primeiras palavras antes de código numérico)
  const modeloMatch = objetoSegurado
    .replace(/^\d+\s*[\-‑–—]\s*/, '') // Remove código HDI
    .split(/[\-–—]/)[0]?.trim();

  // Se tem placa ou chassi, é um veículo
  if (placaMatch || chassiMatch || objetoSegurado.toLowerCase().includes('auto')) {
    return {
      tipo_item: 'VEICULO',
      placa: placaMatch?.[1]?.toUpperCase(),
      chassi: chassiMatch?.[1]?.toUpperCase(),
      modelo: modeloMatch?.substring(0, 100),
    };
  }

  return null;
}

/**
 * Salva itens da apólice na tabela apolice_itens
 */
export async function saveApoliceItens(
  apoliceId: string,
  ramoNome: string,
  objetoSegurado: string,
  identificacao: string | null,
  userId: string
): Promise<void> {
  // Detecta se é ramo de auto baseado no nome
  const isAutoRamo = ['auto', 'automóvel', 'automovel', 'veículo', 'veiculo']
    .some(kw => ramoNome?.toLowerCase().includes(kw));

  if (!isAutoRamo) {
    console.log(`⏭️ [ITENS] Ramo "${ramoNome}" não é Auto, pulando extração de itens`);
    return;
  }

  const vehicleData = extractVehicleData(objetoSegurado, identificacao || undefined);

  if (!vehicleData) {
    console.log(`⚠️ [ITENS] Não foi possível extrair dados estruturados de: ${objetoSegurado}`);
    return;
  }

  const itemData = {
    apolice_id: apoliceId,
    user_id: userId,
    tipo_item: vehicleData.tipo_item,
    placa: vehicleData.placa || null,
    chassi: vehicleData.chassi || null,
    modelo: vehicleData.modelo || null,
    marca: vehicleData.marca || null,
    ano_fabricacao: vehicleData.ano_fabricacao || null,
    ano_modelo: vehicleData.ano_modelo || null,
    dados_extras: vehicleData.dados_extras || {},
  };

  const { error } = await supabase
    .from('apolice_itens' as any)
    .insert(itemData as any);

  if (error) {
    console.error('❌ [ITENS] Erro ao salvar item:', error);
    // Não propagar erro para não bloquear a importação
  } else {
    console.log(`✅ [ITENS] Veículo salvo: Placa=${vehicleData.placa || 'N/A'}, Modelo=${vehicleData.modelo || 'N/A'}`);
  }
}

// ============================================================
// Error Classification Helper
// ============================================================

export function classifyImportError(error: any, item: PolicyImportItem): ImportError {
  const baseError: ImportError = {
    itemId: item.id,
    fileName: item.fileName,
    clientName: item.clientName,
    stage: 'apolice',
    errorCode: 'UNKNOWN',
    errorMessage: error.message || 'Erro desconhecido',
  };

  const msg = error.message?.toLowerCase() || '';

  // CPF/CNPJ errors
  if (msg.includes('cpf inválido') || msg.includes('cpf invalido')) {
    return { ...baseError, stage: 'cliente', errorCode: 'INVALID_CPF' };
  }
  if (msg.includes('cnpj inválido') || msg.includes('cnpj invalido')) {
    return { ...baseError, stage: 'cliente', errorCode: 'INVALID_CNPJ' };
  }
  if (msg.includes('cpf/cnpj') || msg.includes('formato inválido')) {
    return { ...baseError, stage: 'cliente', errorCode: 'INVALID_DOCUMENT' };
  }

  // Client creation errors
  if (msg.includes('cliente') || msg.includes('client')) {
    return { ...baseError, stage: 'cliente', errorCode: 'CLIENT_CREATION_FAILED' };
  }

  // Upload errors
  if (msg.includes('upload') || msg.includes('storage') || msg.includes('pdf')) {
    return { ...baseError, stage: 'upload', errorCode: 'UPLOAD_FAILED' };
  }

  // Foreign key violations
  if (error.code === '23503' || msg.includes('foreign key')) {
    return {
      ...baseError,
      stage: 'apolice',
      errorCode: 'FK_VIOLATION',
      errorMessage: 'Seguradora ou Ramo não encontrado',
      details: error.details || error.hint
    };
  }

  // Duplicate key
  if (error.code === '23505' || msg.includes('duplicate')) {
    return {
      ...baseError,
      stage: 'apolice',
      errorCode: 'DUPLICATE',
      errorMessage: 'Apólice já existe no sistema'
    };
  }

  return baseError;
}

// ============================================================
// 🎯 CORE ORCHESTRATION: executePolicyImport (Atomic Service Layer)
// ============================================================

/**
 * Busca contexto rico para descrição de comissão (cliente + ramo)
 */
async function fetchPolicyContext(clientId: string, ramoId?: string): Promise<{ clientName: string; ramoName: string }> {
  const [clientResult, ramoResult] = await Promise.all([
    supabase.from('clientes').select('name').eq('id', clientId).single(),
    ramoId ? supabase.from('ramos').select('nome').eq('id', ramoId).maybeSingle() : Promise.resolve({ data: null })
  ]);

  return {
    clientName: clientResult.data?.name || 'Cliente',
    ramoName: (ramoResult.data as any)?.nome || 'Seguro'
  };
}

/**
 * 🎯 **FUNÇÃO CENTRALIZADA DE IMPORTAÇÃO**
 * Orquestra todo o fluxo de importação de uma apólice:
 * 1. Upsert do cliente via documento (CPF/CNPJ)
 * 2. Upload do PDF para Storage
 * 3. Insert da apólice na tabela 'apolices'
 * 4. Salvamento de itens estruturados (veículos)
 * 5. Geração de comissão (resiliente - não bloqueia)
 * 
 * @returns PolicyImportResult com success, policyId, error, etc.
 */
export async function executePolicyImport(
  item: PolicyImportItem,
  userId: string,
  activeBrokerageId: string,
  options?: {
    defaultProducerId?: string;
  }
): Promise<PolicyImportResult> {
  console.log(`🚀 [IMPORT] Iniciando importação: ${item.fileName}`);

  let clientId = item.clientId;
  let clientCreated = false;

  try {
    // ============================================================
    // STEP 1: Upsert Cliente
    // ============================================================
    if (item.clientStatus === 'new' || !clientId) {
      // Tenta upsert por documento primeiro
      if (item.clientCpfCnpj) {
        const upsertResult = await upsertClientByDocument(
          item.clientCpfCnpj,
          item.clientName,
          item.extracted.cliente.email,
          item.extracted.cliente.telefone,
          item.extracted.cliente.endereco_completo,
          userId
        );

        if (upsertResult) {
          clientId = upsertResult.id;
          clientCreated = upsertResult.created;
          console.log(`✅ [IMPORT] Cliente ${clientCreated ? 'criado' : 'vinculado'}: ${upsertResult.name}`);
        }
      }

      // Fallback: criar cliente manualmente se upsert falhou
      if (!clientId) {
        const newClient = await createClientFromEdited(
          item.clientName,
          item.clientCpfCnpj,
          item.extracted.cliente.email,
          item.extracted.cliente.telefone,
          item.extracted.cliente.endereco_completo,
          userId
        );
        clientId = newClient.id;
        clientCreated = true;
        console.log(`✅ [IMPORT] Cliente criado via fallback: ${item.clientName}`);
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Não foi possível criar ou vincular cliente',
        errorCode: 'CLIENT_CREATION_FAILED'
      };
    }

    // ============================================================
    // STEP 2: Upload PDF
    // ============================================================
    const pdfUrl = await uploadPolicyPdf(
      item.file,
      userId,
      item.clientCpfCnpj || undefined,
      item.numeroApolice || undefined,
      activeBrokerageId
    );

    if (!pdfUrl) {
      return {
        success: false,
        clientId,
        clientCreated,
        error: `Upload do PDF falhou para ${item.fileName}`,
        errorCode: 'UPLOAD_FAILED'
      };
    }

    // ============================================================
    // STEP 3: Insert Apólice
    // ============================================================
    const isOrcamento = item.tipoDocumento === 'ORCAMENTO';
    const finalStatus = isOrcamento ? 'Orçamento' : 'Ativa';

    // Nomenclatura Elite
    const primeiroNome = item.clientName?.split(' ')[0]?.replace(/NÃO|IDENTIFICADO/gi, '').trim() || 'Cliente';
    const objetoResumo = item.objetoSegurado
      ? item.objetoSegurado.split(' ').slice(0, 3).join(' ').substring(0, 25)
      : '';
    const placa = item.identificacaoAdicional || '';
    const seguradoraSigla = item.seguradoraNome?.split(' ')[0]?.toUpperCase() || 'CIA';
    const tipoDoc = item.tipoDocumento === 'ENDOSSO'
      ? 'ENDOSSO'
      : item.tipoOperacao === 'RENOVACAO'
        ? 'RENOVACAO'
        : 'NOVA';

    let nomenclaturaElite = `${primeiroNome} - ${item.ramoNome || 'Seguro'}`;
    if (objetoResumo) nomenclaturaElite += ` (${objetoResumo})`;
    if (placa) nomenclaturaElite += ` - ${placa}`;
    nomenclaturaElite += ` - ${seguradoraSigla} - ${tipoDoc}`;
    const insuredAssetFinal = nomenclaturaElite.substring(0, 100);

    // Verificar se type é UUID (ramo_id) para mapeamento correto
    const isRamoUuid = item.ramoId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(item.ramoId);

    const { data: newPolicy, error: insertError } = await supabase
      .from('apolices')
      .insert({
        user_id: userId,
        client_id: clientId,
        policy_number: item.numeroApolice || null,
        insurance_company: item.seguradoraId,
        type: item.ramoId,
        ramo_id: isRamoUuid ? item.ramoId : null,
        insured_asset: insuredAssetFinal,
        premium_value: item.premioLiquido,
        commission_rate: item.commissionRate,
        status: finalStatus,
        start_date: item.dataInicio,
        expiration_date: item.dataFim,
        pdf_url: pdfUrl,
        producer_id: item.producerId || options?.defaultProducerId || null,
        brokerage_id: activeBrokerageId ? Number(activeBrokerageId) : null,
        automatic_renewal: !isOrcamento
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [IMPORT] Erro ao inserir apólice:', insertError);
      return {
        success: false,
        clientId,
        clientCreated,
        error: `Falha ao criar apólice: ${insertError.message}`,
        errorCode: insertError.code || 'INSERT_FAILED'
      };
    }

    const policyId = newPolicy.id;
    console.log(`✅ [IMPORT] Apólice criada: ${policyId} (${item.numeroApolice})`);

    // ============================================================
    // STEP 4: Salvar Itens Estruturados (Veículos) - Não Bloqueia
    // ============================================================
    if (item.ramoNome) {
      try {
        await saveApoliceItens(
          policyId,
          item.ramoNome,
          item.objetoSegurado || '',
          item.identificacaoAdicional,
          userId
        );
      } catch (itemError) {
        console.warn('⚠️ [IMPORT] Erro ao salvar itens, mas apólice criada:', itemError);
      }
    }

    // ============================================================
    // STEP 5: Gerar Comissão (Resiliente - Isolado em try/catch)
    // ============================================================
    let commissionCreated = false;
    let commissionError: string | undefined;

    if (finalStatus === 'Ativa') {
      try {
        console.log(`💰 [IMPORT] Gerando comissão para apólice: ${item.numeroApolice}`);

        // Buscar contexto para descrição rica
        const context = await fetchPolicyContext(clientId, item.ramoId || undefined);

        // Montar objeto Policy para a função de comissão
        const policyForCommission: Policy = {
          id: policyId,
          clientId,
          policyNumber: item.numeroApolice,
          insuranceCompany: item.seguradoraId || undefined,
          type: item.ramoId || undefined,
          insuredAsset: insuredAssetFinal,
          premiumValue: item.premioLiquido,
          commissionRate: item.commissionRate,
          status: finalStatus as any,
          expirationDate: item.dataFim,
          startDate: item.dataInicio,
          createdAt: new Date().toISOString(),
          userId,
          producerId: item.producerId || options?.defaultProducerId,
          brokerageId: activeBrokerageId ? Number(activeBrokerageId) : undefined,
          automaticRenewal: !isOrcamento
        };

        // Chamar geração de comissão (apenas legado por enquanto - ERP será chamado pelo hook)
        await gerarTransacaoDeComissao(policyForCommission);
        commissionCreated = true;
        console.log(`✅ [IMPORT] Comissão criada para: ${item.numeroApolice}`);

      } catch (commError: any) {
        // 🛡️ REGRA DE OURO: Falha na comissão NÃO invalida a importação
        commissionError = commError.message || 'Erro desconhecido na comissão';
        console.warn(`⚠️ [IMPORT] Comissão falhou (apólice OK): ${commissionError}`);
      }
    } else {
      console.log(`📋 [IMPORT] Apólice não ativa (${finalStatus}), sem comissão`);
    }

    // ============================================================
    // RESULT: Sucesso
    // ============================================================
    return {
      success: true,
      policyId,
      clientId,
      clientCreated,
      commissionCreated,
      commissionError
    };

  } catch (error: any) {
    console.error('❌ [IMPORT] Erro geral:', error);
    return {
      success: false,
      clientId,
      clientCreated,
      error: error.message || 'Erro desconhecido na importação',
      errorCode: error.code || 'UNKNOWN'
    };
  }
}

// ============================================================

/**
 * Vincula uma carteirinha a uma apólice existente
 * 1. Faz upload do arquivo para storage
 * 2. Atualiza o campo carteirinha_url na apólice
 */
export async function linkCarteirinhaToPolicy(
  policyId: string,
  carteirinhaFile: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. Upload para storage
    const safeName = carteirinhaFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `carteirinhas/${userId}/${policyId}/${Date.now()}_${safeName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('policy-docs')
      .upload(path, carteirinhaFile, { upsert: true });

    if (uploadError) throw uploadError;

    // 2. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('policy-docs')
      .getPublicUrl(path);

    // 3. Atualizar apólice com URL da carteirinha
    const { error: updateError } = await supabase
      .from('apolices')
      .update({
        carteirinha_url: urlData.publicUrl,
        last_ocr_type: 'carteirinha'
      })
      .eq('id', policyId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    console.log(`✅ [CARTEIRINHA] Vinculada à apólice ${policyId}`);
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('❌ [CARTEIRINHA] Erro ao vincular:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Busca apólices de saúde de um cliente para vincular carteirinha
 */
export async function findHealthPoliciesByClient(
  clientId: string,
  userId: string
): Promise<{ id: string; policy_number: string | null; insured_asset: string | null; company_name: string | null }[]> {
  const { data, error } = await supabase
    .from('apolices')
    .select(`
      id,
      policy_number,
      insured_asset,
      companies:insurance_company(name)
    `)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .or('type.ilike.%saude%,type.ilike.%saúde%,type.ilike.%vida%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar apólices de saúde:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    policy_number: p.policy_number,
    insured_asset: p.insured_asset,
    company_name: (p.companies as any)?.name || null
  }));
}
