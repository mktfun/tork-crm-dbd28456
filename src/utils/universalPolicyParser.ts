/**
 * ============================================================
 * UNIVERSAL POLICY PARSER v5.1 - "ANTI-NOISE + VEHICLE EXTRACTION"
 * 
 * Estratégia: 
 * 1. Cria versão AlphaNum do texto (só A-Z e 0-9)
 * 2. Localiza âncora no AlphaNum
 * 3. Mapeia posição para texto original
 * 4. Extrai janela do original e aplica Regex tolerante
 * 
 * v5.1 Improvements:
 * - Institutional blacklist for client name filtering
 * - Expanded premium anchors
 * - Vehicle brand/model/year extraction
 * - Smart objeto_segurado construction
 * 
 * Zero dependência de IA - 100% determinístico
 * ============================================================
 */

// ============================================================
// INTERFACE DE SAÍDA
// ============================================================

export interface ParsedPolicy {
  // Cliente
  nome_cliente: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  
  // Documento
  numero_apolice: string | null;
  numero_proposta: string | null;
  
  // Seguro
  nome_seguradora: string | null;
  ramo_seguro: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  
  // Objeto
  objeto_segurado: string | null;
  placa: string | null;
  chassi: string | null;
  
  // Veículo (quando aplicável)
  marca: string | null;
  modelo: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  
  // Valores
  premio_liquido: number | null;
  premio_total: number | null;
  
  // Meta
  confidence: number;
  matched_fields: string[];
  arquivo_origem?: string;
}

// ============================================================
// CONSTANTES
// ============================================================

// Score mínimo para o Progressive Scan parar de buscar mais páginas
export const CONFIDENCE_THRESHOLD = 80;

// ============================================================
// v5.1: INSTITUTIONAL BLACKLIST
// Termos que NÃO devem aparecer em nomes de segurados
// ============================================================

const INSTITUTIONAL_BLACKLIST = [
  'SEGURADORA', 'SEGUROS', 'CORRETORA', 'CORRETAGEM', 'ESTIPULANTE',
  'TOKIO', 'MARINE', 'PORTO', 'HDI', 'LIBERTY', 'ALLIANZ', 'MAPFRE',
  'SULAMERICA', 'AZUL', 'ZURICH', 'SOMPO', 'BRADESCO', 'ITAU', 'CAIXA',
  'MITSUI', 'GENERALI', 'POTTENCIAL', 'JUNTO', 'ALFA', 'BBSEGUROS',
  'LTDA', 'SA', 'EIRELI', 'ME', 'EPP', 'CIA', 'COMPANHIA',
  'CNPJ', 'INSCRICAO', 'RAZAOSOCIAL', 'FANTASIA', 'SUSEP',
  'REPRESENTANTE', 'PROCURADOR', 'BENEFICIARIO', 'PRODUTOR',
];

// ============================================================
// v5.1: CAR BRANDS DICTIONARY
// ============================================================

const CAR_BRANDS = [
  'VW', 'VOLKSWAGEN', 'FIAT', 'CHEVROLET', 'GM', 'FORD', 'TOYOTA',
  'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN', 'JEEP', 'PEUGEOT', 'CITROEN',
  'KIA', 'MITSUBISHI', 'BMW', 'MERCEDES', 'AUDI', 'VOLVO', 'PORSCHE',
  'LANDROVER', 'JAGUAR', 'SUZUKI', 'CHERY', 'JAC', 'CAOA', 'BYD',
  'FIAT', 'YAMAHA', 'HARLEY', 'KAWASAKI', 'DUCATI', 'TRIUMPH',
  'SCANIA', 'VOLVO', 'IVECO', 'MAN', 'DAF',
];

// ============================================================
// v5.1: EXPANDED PREMIUM ANCHORS
// ============================================================

const PREMIO_LIQUIDO_ANCHORS = [
  'PREMIOLIQUIDO', 'LIQUIDO', 'PREMIONET', 'PREMIOSEMLOF',
  'VALORLIQUIDO', 'LIQTOTAL', 'PREMIOANUAL', 'PREMIOMENSAL',
  'PREMIOCOMERCIAL', 'PREMIOLIQ', 'VLRLIQUIDO', 'VALORNET',
  'PREMIOBASE', 'VALORSEGURO', 'PREMIOSEMLOF', 'PREMIODOSEGURO',
];

const PREMIO_TOTAL_ANCHORS = [
  'PREMIOTOTAL', 'TOTAL', 'PREMIOFINAL', 'VALORAPAGAR', 'TOTALGERAL',
  'TOTALAPAGAR', 'VALORFINALDOSEGURO', 'PREMIOCOMERCIAL',
];

// ============================================================
// ALPHA TEXT STRATEGY (v5.0)
// ============================================================

interface AlphaMapResult {
  alpha: string;           // Texto só com A-Z e 0-9
  indexMap: number[];      // indexMap[alphaIdx] = originalIdx
}

/**
 * Cria versão alfanumérica do texto para busca de âncoras
 * Mantém mapeamento para voltar ao texto original
 */
function createAlphaText(originalText: string): AlphaMapResult {
  const alpha: string[] = [];
  const indexMap: number[] = [];
  
  for (let i = 0; i < originalText.length; i++) {
    const char = originalText[i].toUpperCase();
    if (/[A-Z0-9]/.test(char)) {
      alpha.push(char);
      indexMap.push(i);
    }
  }
  
  return {
    alpha: alpha.join(''),
    indexMap,
  };
}

/**
 * Busca âncora no texto alpha e extrai do original
 */
function alphaWindowExtract(
  originalText: string,
  alphaText: string,
  indexMap: number[],
  anchors: string[],
  regex: RegExp,
  windowSize: number = 150
): string | null {
  for (const anchor of anchors) {
    // Remove tudo que não é alfanumérico da âncora
    const alphaAnchor = anchor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    let searchIdx = 0;
    while (true) {
      const anchorIdx = alphaText.indexOf(alphaAnchor, searchIdx);
      if (anchorIdx === -1) break;
      
      // Mapeia posição do alpha para o original
      const afterAnchorAlphaIdx = anchorIdx + alphaAnchor.length;
      const originalIdx = indexMap[afterAnchorAlphaIdx] || indexMap[indexMap.length - 1] || 0;
      
      // Extrai janela do texto ORIGINAL
      const window = originalText.substring(originalIdx, originalIdx + windowSize);
      
      const match = window.match(regex);
      if (match?.[1] || match?.[0]) {
        const value = (match[1] || match[0]).trim();
        if (value.length >= 3) {
          return value;
        }
      }
      
      searchIdx = anchorIdx + 1;
    }
  }
  
  return null;
}

/**
 * v5.1: Extrai múltiplos candidatos de nome e retorna o primeiro válido
 */
function alphaWindowExtractMultiple(
  originalText: string,
  alphaText: string,
  indexMap: number[],
  anchors: string[],
  regex: RegExp,
  windowSize: number = 150,
  maxCandidates: number = 5
): string[] {
  const candidates: string[] = [];
  
  for (const anchor of anchors) {
    const alphaAnchor = anchor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    let searchIdx = 0;
    while (candidates.length < maxCandidates) {
      const anchorIdx = alphaText.indexOf(alphaAnchor, searchIdx);
      if (anchorIdx === -1) break;
      
      const afterAnchorAlphaIdx = anchorIdx + alphaAnchor.length;
      const originalIdx = indexMap[afterAnchorAlphaIdx] || indexMap[indexMap.length - 1] || 0;
      const window = originalText.substring(originalIdx, originalIdx + windowSize);
      
      const match = window.match(regex);
      if (match?.[1] || match?.[0]) {
        const value = (match[1] || match[0]).trim();
        if (value.length >= 5) {
          candidates.push(value);
        }
      }
      
      searchIdx = anchorIdx + 1;
    }
  }
  
  return candidates;
}

// ============================================================
// v5.1: NAME VALIDATION FUNCTION
// ============================================================

/**
 * Valida se um nome é válido para cliente (não é institucional)
 */
function isValidClientName(name: string): boolean {
  if (!name) return false;
  
  // Remove espaços extras e normaliza
  const cleanName = name.trim().replace(/\s+/g, ' ');
  
  // v5.2: Mínimo de 8 caracteres (mais realista para nomes reais)
  if (cleanName.length < 8) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (muito curto: ${cleanName.length} chars)`);
    return false;
  }
  
  const words = cleanName.split(' ');
  
  // Mínimo de 2 palavras
  if (words.length < 2) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (apenas ${words.length} palavra)`);
    return false;
  }
  
  // v5.2: CADA palavra deve ter pelo menos 2 caracteres
  const validWords = words.filter(w => w.length >= 2);
  if (validWords.length < 2) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (palavras muito curtas)`);
    return false;
  }
  
  // v5.2: Pelo menos UMA palavra deve ter 3+ caracteres (evita "Ra Jj")
  const hasSubstantialWord = words.some(w => w.length >= 3);
  if (!hasSubstantialWord) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (sem palavra substancial)`);
    return false;
  }
  
  // Cria versão alpha do nome para checar blacklist
  const alphaName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  for (const forbidden of INSTITUTIONAL_BLACKLIST) {
    if (alphaName.includes(forbidden)) {
      console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (contém "${forbidden}")`);
      return false;
    }
  }
  
  return true;
}

// ============================================================
// v5.1: VEHICLE EXTRACTION FUNCTION
// ============================================================

interface VehicleInfo {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
}

/**
 * Extrai informações do veículo (marca, modelo, ano)
 */
function extractVehicleInfo(
  originalText: string,
  alphaText: string,
  indexMap: number[]
): VehicleInfo {
  const vehicleAnchors = ['VEICULO', 'MODELO', 'MARCA', 'FABRICANTE', 'AUTOMOVEL', 'SEGURADO'];
  
  for (const anchor of vehicleAnchors) {
    let searchIdx = 0;
    while (true) {
      const idx = alphaText.indexOf(anchor, searchIdx);
      if (idx === -1) break;
      
      const originalIdx = indexMap[idx + anchor.length] || 0;
      const window = originalText.substring(originalIdx, originalIdx + 200).toUpperCase();
      
      // Procura marca conhecida na janela
      for (const brand of CAR_BRANDS) {
        const brandIdx = window.indexOf(brand);
        if (brandIdx !== -1) {
          // Captura texto após a marca (modelo)
          const afterBrand = window.substring(brandIdx + brand.length, brandIdx + brand.length + 50);
          const modelMatch = afterBrand.match(/^\s*([A-Z0-9\-\s]{2,25})/);
          let modelo = modelMatch?.[1]?.trim() || null;
          
          // Limpa o modelo de caracteres indesejados
          if (modelo) {
            modelo = modelo.replace(/\s+/g, ' ').trim();
            // Remove se modelo for muito curto ou parecer lixo
            if (modelo.length < 2 || /^[\d\-]+$/.test(modelo)) {
              modelo = null;
            }
          }
          
          // Busca ano (4 dígitos começando com 19 ou 20)
          const anoMatch = window.match(/\b(19|20)\d{2}\b/);
          const ano = anoMatch ? parseInt(anoMatch[0]) : null;
          
          console.log(`🚗 [VEHICLE] Marca: ${brand}, Modelo: ${modelo}, Ano: ${ano}`);
          
          return { marca: brand, modelo, ano };
        }
      }
      
      searchIdx = idx + 1;
    }
  }
  
  return { marca: null, modelo: null, ano: null };
}

// ============================================================
// DOCUMENT CLEANING & VALIDATION
// ============================================================

/**
 * Limpa documento para apenas dígitos e valida tamanho
 */
function cleanDocument(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  
  // CPF: 11 dígitos, CNPJ: 14 dígitos
  if (digits.length === 11 || digits.length === 14) {
    return digits;
  }
  
  // Se tiver mais dígitos que esperado, tenta extrair os primeiros 11 ou 14
  if (digits.length > 14) {
    return digits.substring(0, 14);
  }
  if (digits.length > 11 && digits.length < 14) {
    return digits.substring(0, 11);
  }
  
  return null;
}

/**
 * Formata data brasileira para ISO
 */
function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  
  // Remove espaços internos
  const cleaned = raw.replace(/\s/g, '');
  
  // Tenta DD/MM/YYYY ou DD-MM-YYYY
  const match = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  
  return null;
}

/**
 * v5.1: Extrai valor monetário com regex mais robusto
 */
function parseMoneyValue(raw: string | null): number | null {
  if (!raw) return null;
  
  // Remove R$, espaços, pontos de milhar
  let cleaned = raw.replace(/[R$\s]/gi, '');
  
  // Trata formato brasileiro: 1.234,56 → 1234.56
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  
  const value = parseFloat(cleaned);
  return isNaN(value) || value <= 0 ? null : value;
}

// ============================================================
// SEGURADORA DETECTION
// ============================================================

const INSURER_BRANDS: Record<string, string> = {
  'TOKIOMARINE': 'Tokio Marine',
  'TOKIO': 'Tokio Marine',
  'PORTOSEGURO': 'Porto Seguro',
  'PORTO': 'Porto Seguro',
  'HDI': 'HDI',
  'LIBERTY': 'Liberty',
  'MAPFRE': 'Mapfre',
  'ALLIANZ': 'Allianz',
  'BRADESCO': 'Bradesco Seguros',
  'SULAMERICA': 'SulAmérica',
  'SULAAMERICA': 'SulAmérica',
  'AZULSEGUROS': 'Azul Seguros',
  'AZUL': 'Azul Seguros',
  'SOMPO': 'Sompo',
  'ITAUSEGUROS': 'Itaú Seguros',
  'ITAU': 'Itaú Seguros',
  'ZURICH': 'Zurich',
  'GENERALI': 'Generali',
  'POTTENCIAL': 'Pottencial',
  'JUNTO': 'Junto Seguros',
  'CAIXA': 'Caixa Seguros',
  'BBSEGUROS': 'BB Seguros',
  'MITSUI': 'Mitsui Sumitomo',
  'ALFA': 'Alfa Seguros',
};

function detectSeguradora(alphaText: string): string | null {
  for (const [brand, displayName] of Object.entries(INSURER_BRANDS)) {
    if (alphaText.includes(brand)) {
      return displayName;
    }
  }
  return null;
}

// ============================================================
// RAMO INFERENCE (v5.0)
// ============================================================

interface RamoKeywords {
  ramo: string;
  keywords: string[];
}

const RAMO_KEYWORDS_LIST: RamoKeywords[] = [
  { ramo: 'Automóvel', keywords: ['PLACA', 'VEICULO', 'AUTOMOVEL', 'AUTO', 'CARRO', 'MOTO', 'CAMINHAO', 'CHASSI', 'RENAVAM', 'FIPE', 'CONDUTOR', 'COLISAO', 'ROUBO', 'FURTO'] },
  { ramo: 'Residencial', keywords: ['RESIDENCIAL', 'RESIDENCIA', 'CASA', 'APARTAMENTO', 'IMOVEL', 'MORADIA', 'LAR', 'INCENDIO'] },
  { ramo: 'Vida', keywords: ['VIDA', 'MORTE', 'INVALIDEZ', 'FUNERAL', 'SOBREVIVENCIA', 'PRESTAMISTA', 'BENEFICIARIO', 'IPA'] },
  { ramo: 'Empresarial', keywords: ['EMPRESARIAL', 'EMPRESA', 'COMERCIAL', 'ESTABELECIMENTO', 'LUCROSCESSANTES'] },
  { ramo: 'Saúde', keywords: ['SAUDE', 'MEDICO', 'HOSPITALAR', 'ODONTO', 'DENTAL', 'ANS'] },
  { ramo: 'Responsabilidade Civil', keywords: ['RESPONSABILIDADE', 'RCGERAL', 'DO', 'EO'] },
  { ramo: 'Transporte', keywords: ['TRANSPORTE', 'CARGA', 'RCTRC', 'EMBARCADOR', 'FRETE'] },
  { ramo: 'Viagem', keywords: ['VIAGEM', 'TRAVEL', 'INTERNACIONAL', 'BAGAGEM'] },
  { ramo: 'Garantia', keywords: ['FIANCA', 'LOCATICIA', 'GARANTIA', 'JUDICIAL', 'PERFORMANCE'] },
  { ramo: 'Rural', keywords: ['RURAL', 'AGRICOLA', 'SAFRA', 'PECUARIO', 'AGRO'] },
];

function inferRamo(alphaText: string): string | null {
  for (const { ramo, keywords } of RAMO_KEYWORDS_LIST) {
    for (const kw of keywords) {
      if (alphaText.includes(kw)) {
        return ramo;
      }
    }
  }
  return null;
}

// Export para compatibilidade
export function inferRamoFromText(text: string): string | null {
  const { alpha } = createAlphaText(text.toUpperCase());
  return inferRamo(alpha);
}

// ============================================================
// ALIASES EXPORT (compatibilidade)
// ============================================================

export const RAMO_ALIASES: Record<string, string> = {
  'rcf-v': 'AUTOMÓVEL',
  'rcfv': 'AUTOMÓVEL',
  'automovel': 'AUTOMÓVEL',
  'automóvel': 'AUTOMÓVEL',
  'auto pf': 'AUTOMÓVEL',
  'auto pj': 'AUTOMÓVEL',
  'veiculo': 'AUTOMÓVEL',
  'veículo': 'AUTOMÓVEL',
  'residencia': 'RESIDENCIAL',
  'residência': 'RESIDENCIAL',
  'casa': 'RESIDENCIAL',
  'vida': 'VIDA',
  'prestamista': 'VIDA',
  'empresarial': 'EMPRESARIAL',
  'comercial': 'EMPRESARIAL',
  'saude': 'SAÚDE',
  'saúde': 'SAÚDE',
  'viagem': 'VIAGEM',
  'fianca': 'GARANTIA',
  'fiança': 'GARANTIA',
  'rural': 'RURAL',
  'agricola': 'RURAL',
  'transporte': 'TRANSPORTE',
  'carga': 'TRANSPORTE',
  'consorcio': 'CONSÓRCIO',
  'consórcio': 'CONSÓRCIO',
};

export const SEGURADORA_ALIASES: Record<string, string> = {
  'tokio marine': 'TOKIO MARINE',
  'tokiomarine': 'TOKIO MARINE',
  'tokio': 'TOKIO MARINE',
  'porto seguro': 'PORTO SEGURO',
  'portoseguro': 'PORTO SEGURO',
  'porto': 'PORTO SEGURO',
  'hdi': 'HDI',
  'allianz': 'ALLIANZ',
  'sulamerica': 'SULAMÉRICA',
  'sulamérica': 'SULAMÉRICA',
  'liberty': 'LIBERTY',
  'mapfre': 'MAPFRE',
  'zurich': 'ZURICH',
  'azul': 'AZUL SEGUROS',
  'sompo': 'SOMPO',
  'itau': 'ITAÚ SEGUROS',
  'itaú': 'ITAÚ SEGUROS',
  'bradesco': 'BRADESCO',
  'caixa': 'CAIXA',
  'bb seguros': 'BB SEGUROS',
  'junto': 'JUNTO',
  'generali': 'GENERALI',
  'pottencial': 'POTTENCIAL',
};

export function normalizeSeguradora(nome: string | null): string | null {
  if (!nome) return null;
  const key = nome.toLowerCase().trim();
  return SEGURADORA_ALIASES[key] || nome.toUpperCase();
}

// ============================================================
// MAIN PARSER (v5.1)
// ============================================================

// Regex tolerantes para OCR ruidoso
const CPF_REGEX = /(\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d)/;
const CNPJ_REGEX = /(\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d)/;
const PLACA_REGEX = /([A-Z][\s]*[A-Z][\s]*[A-Z][\s]*[\-\s]*\d[\s]*[A-Z0-9][\s]*\d[\s]*\d)/i;
const DATA_REGEX = /(\d{1,2}[\s]*[\/\-][\s]*\d{1,2}[\s]*[\/\-][\s]*\d{4})/;
// v5.1: Regex monetário mais robusto
const VALOR_REGEX = /(?:R\$|BRL)?\s*([\d]{1,3}(?:[.\s]?\d{3})*[,]\d{2})/;
const APOLICE_REGEX = /(\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d+)/;
const NOME_REGEX = /([A-ZÀ-Ú\s]{5,60})/;

export function parsePolicy(rawText: string, fileName?: string): ParsedPolicy {
  const matchedFields: string[] = [];
  
  // Normaliza texto para maiúsculas
  const text = rawText.toUpperCase();
  
  // Cria versão alfa para busca de âncoras
  const { alpha, indexMap } = createAlphaText(text);
  
  console.log(`🔍 [PARSER v5.1] Original: ${text.length} chars, Alpha: ${alpha.length} chars`);
  
  // --- CPF/CNPJ ---
  let cpfCnpj: string | null = null;
  
  const cpfRaw = alphaWindowExtract(
    text, alpha, indexMap,
    ['CPF', 'CPFMF', 'CPFCNPJ', 'DOCUMENTO', 'CPF:'],
    CPF_REGEX,
    100
  );
  
  if (cpfRaw) {
    cpfCnpj = cleanDocument(cpfRaw);
    if (cpfCnpj?.length === 11) {
      matchedFields.push('cpf');
    }
  }
  
  if (!cpfCnpj) {
    const cnpjRaw = alphaWindowExtract(
      text, alpha, indexMap,
      ['CNPJ', 'CNPJMF', 'INSCRICAO'],
      CNPJ_REGEX,
      100
    );
    
    if (cnpjRaw) {
      cpfCnpj = cleanDocument(cnpjRaw);
      if (cpfCnpj?.length === 14) {
        matchedFields.push('cnpj');
      }
    }
  }
  
  // --- NÚMERO DA APÓLICE ---
  let numeroApolice: string | null = null;
  
  const apoliceRaw = alphaWindowExtract(
    text, alpha, indexMap,
    ['APOLICE', 'APÓLICE', 'PROPOSTA', 'NUMERO', 'CONTRATO', 'N°', 'Nº'],
    APOLICE_REGEX,
    100
  );
  
  if (apoliceRaw) {
    const digits = apoliceRaw.replace(/\D/g, '');
    if (digits.length >= 4) {
      numeroApolice = digits;
      matchedFields.push('apolice');
    }
  }
  
  // --- PLACA ---
  let placa: string | null = null;
  
  const placaRaw = alphaWindowExtract(
    text, alpha, indexMap,
    ['PLACA'],
    PLACA_REGEX,
    50
  );
  
  if (placaRaw) {
    const cleanPlaca = placaRaw.replace(/[\s\-]/g, '').toUpperCase();
    if (cleanPlaca.length === 7) {
      placa = cleanPlaca;
      matchedFields.push('placa');
    }
  }
  
  // --- DATAS ---
  let dataInicio: string | null = null;
  let dataFim: string | null = null;
  
  const inicioRaw = alphaWindowExtract(
    text, alpha, indexMap,
    ['VIGENCIA', 'INICIO', 'INICIODAVIGENCIA', 'DE:'],
    DATA_REGEX,
    60
  );
  if (inicioRaw) {
    dataInicio = formatDate(inicioRaw);
    if (dataInicio) matchedFields.push('data_inicio');
  }
  
  const fimRaw = alphaWindowExtract(
    text, alpha, indexMap,
    ['TERMINO', 'FIM', 'FIMDAVIGENCIA', 'VENCIMENTO', 'ATE:', 'ATÉ:'],
    DATA_REGEX,
    60
  );
  if (fimRaw) {
    dataFim = formatDate(fimRaw);
    if (dataFim) matchedFields.push('data_fim');
  }
  
  // --- VALORES (v5.1: Âncoras expandidas) ---
  let premioLiquido: number | null = null;
  let premioTotal: number | null = null;
  
  const premioRaw = alphaWindowExtract(
    text, alpha, indexMap,
    PREMIO_LIQUIDO_ANCHORS,
    VALOR_REGEX,
    100
  );
  if (premioRaw) {
    premioLiquido = parseMoneyValue(premioRaw);
    if (premioLiquido) matchedFields.push('premio_liquido');
  }
  
  const totalRaw = alphaWindowExtract(
    text, alpha, indexMap,
    PREMIO_TOTAL_ANCHORS,
    VALOR_REGEX,
    100
  );
  if (totalRaw) {
    premioTotal = parseMoneyValue(totalRaw);
    if (premioTotal) matchedFields.push('premio_total');
  }
  
  // --- SEGURADORA ---
  const nomeSeguradora = detectSeguradora(alpha);
  if (nomeSeguradora) matchedFields.push('seguradora');
  
  // --- RAMO ---
  let ramoSeguro = inferRamo(alpha);
  
  // Se encontrou placa, força ramo Automóvel
  if (placa && !ramoSeguro) {
    ramoSeguro = 'Automóvel';
    matchedFields.push('ramo_inferred');
  } else if (ramoSeguro) {
    matchedFields.push('ramo');
  }
  
  // --- v5.1: EXTRAÇÃO DE VEÍCULO ---
  let marca: string | null = null;
  let modelo: string | null = null;
  let anoFabricacao: number | null = null;
  let anoModelo: number | null = null;
  
  if (ramoSeguro === 'Automóvel' || placa) {
    const vehicleInfo = extractVehicleInfo(text, alpha, indexMap);
    marca = vehicleInfo.marca;
    modelo = vehicleInfo.modelo;
    anoFabricacao = vehicleInfo.ano;
    anoModelo = vehicleInfo.ano;
    
    if (marca) matchedFields.push('marca');
    if (modelo) matchedFields.push('modelo');
    if (anoFabricacao) matchedFields.push('ano');
  }
  
  // --- v5.1: NOME DO CLIENTE (com filtro de blacklist) ---
  let nomeCliente: string | null = null;
  
  const nomeCandidates = alphaWindowExtractMultiple(
    text, alpha, indexMap,
    ['SEGURADO', 'NOME', 'PROPONENTE', 'TITULAR', 'CLIENTE'],
    NOME_REGEX,
    100,
    5
  );
  
  // Filtra candidatos pela blacklist e pega o primeiro válido
  for (const candidate of nomeCandidates) {
    if (isValidClientName(candidate)) {
      nomeCliente = candidate.trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      matchedFields.push('nome');
      break;
    }
  }
  
  // --- v5.1: MONTAGEM INTELIGENTE DO OBJETO SEGURADO ---
  let objetoSegurado: string | null = null;
  
  if (ramoSeguro === 'Automóvel' || placa) {
    // Automóvel: combina marca, modelo, ano e placa
    const parts: string[] = [];
    
    if (marca) parts.push(marca);
    if (modelo) parts.push(modelo);
    if (anoFabricacao) parts.push(String(anoFabricacao));
    
    if (parts.length > 0 && placa) {
      objetoSegurado = `${parts.join(' ')} - Placa: ${placa}`;
    } else if (placa) {
      objetoSegurado = `Veículo - Placa: ${placa}`;
    } else if (parts.length > 0) {
      objetoSegurado = parts.join(' ');
    }
  }
  // Para outros ramos, objeto_segurado fica null (preenchimento manual)
  
  // --- CÁLCULO DE CONFIANÇA ---
  const WEIGHTS: Record<string, number> = {
    cpf: 50,
    cnpj: 50,
    apolice: 15,
    placa: 15,
    data_inicio: 5,
    data_fim: 5,
    premio_liquido: 5,
    premio_total: 5,
    seguradora: 10,
    ramo: 5,
    ramo_inferred: 5,
    nome: 5,
    marca: 3,
    modelo: 3,
    ano: 2,
  };
  
  let confidence = 0;
  for (const field of matchedFields) {
    confidence += WEIGHTS[field] || 0;
  }
  confidence = Math.min(100, confidence);
  
  console.log(`🔍 [PARSER v5.1] Confiança: ${confidence}%, Campos: ${matchedFields.join(', ')}`);
  
  return {
    nome_cliente: nomeCliente,
    cpf_cnpj: cpfCnpj,
    email: null,
    telefone: null,
    endereco_completo: null,
    
    numero_apolice: numeroApolice,
    numero_proposta: null,
    
    nome_seguradora: nomeSeguradora,
    ramo_seguro: ramoSeguro,
    data_inicio: dataInicio,
    data_fim: dataFim,
    
    objeto_segurado: objetoSegurado,
    placa: placa,
    chassi: null,
    
    marca: marca,
    modelo: modelo,
    ano_fabricacao: anoFabricacao,
    ano_modelo: anoModelo,
    
    // v5.2: Fallback - se não tem prêmio líquido, estima a partir do total
    premio_liquido: premioLiquido ?? (premioTotal ? Math.round((premioTotal / 1.0738) * 100) / 100 : null),
    premio_total: premioTotal ?? premioLiquido,
    
    confidence,
    matched_fields: premioLiquido === null && premioTotal ? [...matchedFields, 'premio_liquido_estimated'] : matchedFields,
    arquivo_origem: fileName,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export { parsePolicy as default };
