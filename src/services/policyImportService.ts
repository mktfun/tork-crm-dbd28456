import { supabase } from '@/integrations/supabase/client';
import { ExtractedPolicyData, PolicyImportItem, ClientReconcileStatus, ImportError } from '@/types/policyImport';

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
    ? `${normalized.slice(0,3)}.${normalized.slice(3,6)}.${normalized.slice(6,9)}-${normalized.slice(9)}`
    : null;
  const formattedCnpj = normalized.length === 14
    ? `${normalized.slice(0,2)}.${normalized.slice(2,5)}.${normalized.slice(5,8)}/${normalized.slice(8,12)}-${normalized.slice(12)}`
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

export async function matchRamo(nome: string, userId: string): Promise<{ id: string; nome: string; score: number } | null> {
  if (!nome) return null;

  const normalizedName = normalizeText(nome);

  const { data, error } = await supabase
    .from('ramos')
    .select('id, nome')
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
    console.log(`✅ [MATCH] Ramo "${nome}" → "${exactMatch.nome}" (100% - exato)`);
    return { ...exactMatch, score: 1 };
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
        console.log(`✅ [MATCH] Ramo "${nome}" → "${match.nome}" (keyword: ${key})`);
        return { ...match, score: 0.8 };
      }
    }
  }

  // Try fuzzy matching with similarity score
  const scored = data.map(ramo => ({
    ...ramo,
    score: similarity(nome, ramo.nome)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  const THRESHOLD = 0.4;
  if (scored[0]?.score >= THRESHOLD) {
    console.log(`✅ [MATCH] Ramo "${nome}" → "${scored[0].nome}" (${(scored[0].score * 100).toFixed(0)}% fuzzy)`);
    return scored[0];
  }

  console.warn(`⚠️ [NO MATCH] Ramo "${nome}" não encontrado (melhor: ${scored[0]?.nome} ${(scored[0]?.score * 100).toFixed(0)}%)`);
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
 * Find client by name with fuzzy matching (85%+ threshold - more flexible)
 * Busca em até 500 clientes para garantir cobertura adequada
 */
async function findClientByNameFuzzy(name: string, userId: string) {
  if (!name || name.length < 3) return null;

  // Limpa títulos e sufixos do nome buscado
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

  // ✅ Threshold de 85% (mais flexível para variações de nome)
  const FUZZY_THRESHOLD = 0.85;
  if (scored[0]?.score >= FUZZY_THRESHOLD) {
    console.log(`✅ [FUZZY CLIENT] "${name}" → "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}%)`);
    return scored[0];
  }

  // Log para debug quando não encontra match
  if (scored[0]) {
    console.log(`⚠️ [FUZZY CLIENT] "${name}" melhor match: "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}% < 85%)`);
  }

  return null;
}

/**
 * Upsert de cliente por documento (CPF/CNPJ)
 * Cria automaticamente se não existir, retorna ID se já existe
 */
export async function upsertClientByDocument(
  documento: string,
  nome: string,
  email: string | null,
  telefone: string | null,
  endereco: string | null,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  const normalized = documento.replace(/\D/g, '');
  
  // Validação mínima: CPF (11) ou CNPJ (14)
  if (!normalized || (normalized.length !== 11 && normalized.length !== 14)) {
    console.warn(`⚠️ [UPSERT] Documento inválido: ${documento} (${normalized.length} dígitos)`);
    return null;
  }
  
  // 1. Busca existente pelo documento
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', userId)
    .eq('cpf_cnpj', normalized)
    .maybeSingle();
  
  if (existing) {
    console.log(`✅ [UPSERT] Cliente existente encontrado: ${existing.id}`);
    return { id: existing.id, created: false };
  }
  
  // 2. Cria novo cliente
  const cep = extractCep(endereco);
  const { city, state } = extractCityState(endereco);
  
  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: nome || 'Cliente Importado',
      cpf_cnpj: normalized,
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
    // Se for erro de duplicata (unique constraint), tenta buscar novamente
    if (error.code === '23505') {
      console.log('⚠️ [UPSERT] Conflito de duplicata, buscando existente...');
      const { data: retryExisting } = await supabase
        .from('clientes')
        .select('id')
        .eq('user_id', userId)
        .eq('cpf_cnpj', normalized)
        .maybeSingle();
      
      if (retryExisting) {
        return { id: retryExisting.id, created: false };
      }
    }
    
    console.error('❌ [UPSERT] Erro ao criar cliente:', error);
    return null;
  }
  
  console.log(`✅ [UPSERT] Novo cliente criado: ${newClient.id} (${nome})`);
  return { id: newClient.id, created: true };
}

export async function reconcileClient(
  extracted: ExtractedPolicyData,
  userId: string
): Promise<{
  status: ClientReconcileStatus;
  clientId?: string;
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
        matchedBy: 'email',
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
