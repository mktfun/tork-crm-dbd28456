/**
 * Parser Universal para Extração de Dados de Apólices (v3.0)
 * Arquitetura: OCR → Normalização → Sliding Window → Anchor Search → Dados Estruturados
 * Zero dependência de IA - 100% determinístico
 * 
 * NOVIDADES v3.0:
 * - Sliding Window com multi-pass para maior cobertura
 * - Correção de ruído OCR (espaços entre dígitos, O→0, l→1)
 * - Sistema de confiança com pesos para Progressive Scan
 * - extractByAnchor com busca em TODAS as ocorrências
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
// PESOS PARA CÁLCULO DE CONFIANÇA (v3.0)
// ============================================================

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  cpf_cnpj: 50,       // Crítico: identificação do cliente
  numero_apolice: 20, // Importante: identificação do documento
  placa: 20,          // Importante para auto
  data_inicio: 10,
  data_fim: 10,
  premio_liquido: 10,
  nome_segurado: 10,
  seguradora: 10,
  ramo: 5,
  chassi: 5,
  marca: 3,
  modelo: 3,
  ano: 3,
  email: 2,
  telefone: 2,
  cep: 2,
};

// Score mínimo para o Progressive Scan parar de buscar mais páginas
export const CONFIDENCE_THRESHOLD = 80;

// ============================================================
// NORMALIZAÇÃO DE TEXTO (v3.0 - CORREÇÃO DE RUÍDO OCR)
// ============================================================

/**
 * Normaliza texto OCR para busca uniforme (v3.0)
 * - Remove espaços entre dígitos (ruído OCR)
 * - Corrige O→0 e l/I→1 em contexto numérico
 * - Converte para UPPERCASE para matching case-insensitive
 */
export function normalizeOcrText(rawText: string): string {
  let text = rawText
    .replace(/\r\n/g, '\n')           // Normaliza quebras
    .replace(/\t+/g, ' ')             // Tabs → espaço
    .toUpperCase();                   // Case-insensitive matching
  
  // NOVO v3.0: Remove espaços entre dígitos (OCR noise)
  // "1 2 3 . 4 5 6 . 7 8 9 - 0 0" → "123.456.789-00"
  text = text.replace(/(\d)\s+(?=\d)/g, '$1');
  
  // NOVO v3.0: Corrige O→0 em contexto numérico (OCR noise)
  // "CPF: 123.456.789-O0" → "CPF: 123.456.789-00"
  text = text.replace(/(\d)[O](\d)/g, '$10$2');
  text = text.replace(/(\d)[O]$/g, '$10');     // Final O após dígito
  text = text.replace(/^[O](\d)/g, '0$1');     // Inicial O antes de dígito
  text = text.replace(/([.\-\/])[O](\d)/g, '$10$2'); // O após separador
  text = text.replace(/(\d)[O]([.\-\/])/g, '$10$2'); // O antes de separador
  
  // NOVO v3.0: Corrige l/I→1 em contexto numérico
  text = text.replace(/(\d)[lI](\d)/g, '$11$2');
  text = text.replace(/(\d)[lI]$/g, '$11');
  text = text.replace(/^[lI](\d)/g, '1$1');
  text = text.replace(/([.\-\/])[lI](\d)/g, '$11$2');
  text = text.replace(/(\d)[lI]([.\-\/])/g, '$11$2');
  
  // Remove múltiplos espaços
  text = text.replace(/[ ]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

// ============================================================
// SLIDING WINDOW EXTRACTION (v3.0 - NOVO)
// ============================================================

/**
 * Busca padrão em TODAS as ocorrências de âncoras (v3.0 - Sliding Window)
 * Retorna o melhor match baseado na proximidade com a âncora
 * 
 * @param text Texto normalizado (UPPERCASE)
 * @param anchors Lista de palavras-âncora para buscar
 * @param regex Regex do valor a capturar (deve ter grupo de captura)
 * @param windowSize Raio em caracteres após a âncora
 * @returns Valor capturado mais confiável ou null
 */
function extractByAnchor(
  text: string,
  anchors: string[],
  regex: RegExp,
  windowSize: number = 100
): string | null {
  const results: { value: string; confidence: number }[] = [];
  
  for (const anchor of anchors) {
    const anchorUpper = anchor.toUpperCase();
    let searchIdx = 0;
    
    // Busca TODAS as ocorrências da âncora
    while (true) {
      const anchorIdx = text.indexOf(anchorUpper, searchIdx);
      if (anchorIdx === -1) break;
      
      // Extrai janela após a âncora
      const windowStart = anchorIdx + anchor.length;
      const window = text.substring(windowStart, windowStart + windowSize);
      
      const match = window.match(regex);
      if (match?.[1]) {
        const value = match[1].trim();
        // Score baseado na proximidade (quanto mais perto da âncora, melhor)
        const confidence = 100 - (match.index || 0);
        results.push({ value, confidence });
      }
      
      searchIdx = anchorIdx + 1;
    }
  }
  
  if (results.length === 0) return null;
  
  // Retorna o match mais confiável (mais próximo da âncora)
  results.sort((a, b) => b.confidence - a.confidence);
  return results[0].value;
}

/**
 * Alias para anchorSearch - compatibilidade com versões anteriores
 */
function anchorSearch(
  text: string, 
  anchors: string[], 
  pattern: RegExp, 
  radius: number = 150
): string | null {
  return extractByAnchor(text, anchors, pattern, radius);
}

/**
 * Alias para extractByAnchor - compatibilidade com documentação
 * Localiza a palavra âncora e busca regex nos próximos N caracteres
 */
export function findNear(
  text: string,
  anchor: string,
  regex: RegExp,
  radius: number = 150
): string | null {
  return extractByAnchor(text, [anchor], regex, radius);
}

/**
 * Busca um padrão em TODO o texto (sem âncora)
 * Usado para dados que aparecem isolados (ex: placa)
 */
function globalSearch(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || match?.[0]?.trim() || null;
}

// ============================================================
// PADRÕES REGEX - OTIMIZADOS PARA OCR RUIDOSO
// ============================================================

// CPF: 000.000.000-00 ou 00000000000 (com ruído de OCR)
const CPF_PATTERN = /(\d{3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?\d{2})/;

// CNPJ: 00.000.000/0000-00 ou 00000000000000
const CNPJ_PATTERN = /(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2})/;

// Placa Mercosul: ABC1D23 ou ABC-1D23
const PLACA_MERCOSUL = /([A-Z]{3}[\-\s]?\d[A-Z]\d{2})/;

// Placa Antiga: ABC1234 ou ABC-1234
const PLACA_ANTIGA = /([A-Z]{3}[\-\s]?\d{4})/;

// Número da Apólice: 5-20 dígitos
const APOLICE_PATTERN = /(\d{5,20})/;

// Valores monetários brasileiros (captura grupos de dígitos com vírgula/ponto)
const VALOR_PATTERN = /R?\$?\s*([\d.,]+)/;

// Data brasileira DD/MM/YYYY ou DD-MM-YYYY
const DATA_PATTERN = /(\d{2}[\/-]\d{2}[\/-]\d{4})/;

// Chassi: 17 caracteres alfanuméricos (sem I, O, Q)
const CHASSI_PATTERN = /([A-HJ-NPR-Z0-9]{17})/;

// Email (case-insensitive)
const EMAIL_PATTERN = /([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i;

// Telefone brasileiro
const TELEFONE_PATTERN = /(\(?\d{2}\)?\s*9?\d{4}[\-\s]?\d{4})/;

// Nome segurado (captura palavras após âncora, até 60 chars)
const NOME_PATTERN = /([A-Z\u00C0-\u017F][A-Z\u00C0-\u017F\s]{3,60})/;

// ============================================================
// ÂNCORAS POR CAMPO (v2.1 - Expandido para múltiplas seguradoras)
// ============================================================

const ANCHORS = {
  // Documentos - ordem de prioridade
  cpf: ['CPF', 'C.P.F', 'CPF/MF', 'DOCUMENTO', 'CPF:', 'IDENTIFICAÇÃO', 'IDENTIFICACAO'],
  cnpj: ['CNPJ', 'C.N.P.J', 'INSCRICAO', 'CNPJ:', 'INSCRICÃO', 'REGISTRO'],
  
  // Nome do segurado - múltiplas variações
  segurado: ['SEGURADO', 'TITULAR', 'ESTIPULANTE', 'PROPONENTE', 'CLIENTE', 'NOME:', 
             'SEGURADO PRINCIPAL', 'RESPONSAVEL', 'RESPONSÁVEL', 'CONTRATANTE'],
  
  // Número do documento (apólice/proposta)
  apolice: ['APOLICE', 'APÓLICE', 'N° APOLICE', 'NUMERO APOLICE', 'Nº APOLICE', 
            'APOLICE N', 'N° DA APÓLICE', 'APÓLICE Nº', 'NUMERO DA APOLICE'],
  proposta: ['PROPOSTA', 'N° PROPOSTA', 'NUMERO PROPOSTA', 'PROPOSTA N', 
             'N° DA PROPOSTA', 'PROPOSTA Nº', 'NUMERO DA PROPOSTA'],
  
  // Seguradora
  seguradora: ['SEGURADORA', 'COMPANHIA', 'CIA', 'CIA.', 'SEGUROS', 'SEGURADORA:'],
  
  // Valores monetários
  premio_liquido: ['PREMIO LIQUIDO', 'PRÊMIO LÍQUIDO', 'PRÊMIO LIQ', 'PREMIO LIQ', 
                   'LIQUIDO', 'VALOR LIQUIDO', 'VALOR LÍQUIDO', 'LIQ.'],
  premio_total: ['PREMIO TOTAL', 'PRÊMIO TOTAL', 'TOTAL A PAGAR', 'VALOR TOTAL', 
                 'TOTAL:', 'TOTAL GERAL', 'VALOR A PAGAR'],
  
  // Vigência
  vigencia_inicio: ['INICIO VIGENCIA', 'INÍCIO VIGÊNCIA', 'VIGENCIA DE', 'VIGÊNCIA DE', 
                    'INICIO:', 'DE:', 'INÍCIO DA VIGÊNCIA', 'DATA INICIO', 'DATA INÍCIO'],
  vigencia_fim: ['TERMINO VIGENCIA', 'TÉRMINO VIGÊNCIA', 'VIGENCIA ATE', 'VIGÊNCIA ATÉ', 
                 'ATE:', 'ATÉ:', 'TERMINO:', 'TÉRMINO:', 'FIM DA VIGÊNCIA', 'DATA FIM', 
                 'DATA TÉRMINO', 'VENCIMENTO'],
  
  // Veículo (âncoras expandidas)
  marca: ['MARCA', 'FABRICANTE', 'MARCA:', 'MARCA/MODELO', 'MARCA DO VEICULO'],
  modelo: ['MODELO', 'VEICULO', 'MODELO:', 'MODELO DO VEICULO', 'VEÍCULO'],
  placa: ['PLACA', 'PLACA:', 'PLACA DO VEICULO', 'IDENTIFICAÇÃO', 'IDENTIFICACAO'],
  chassi: ['CHASSI', 'CHASSIS', 'CHASSI:', 'NUMERO DO CHASSI', 'Nº CHASSI'],
  ano: ['ANO', 'ANO/MODELO', 'ANO FAB', 'ANO MODELO', 'ANO:', 'ANO FABRICAÇÃO', 
        'ANO FABRICACAO', 'ANO/MOD'],
};

// ============================================================
// ALIASES E INFERÊNCIA DE RAMO (v2.0 - Expandido)
// ============================================================

export const RAMO_ALIASES: Record<string, string> = {
  // Automóvel
  'rcf-v': 'AUTOMÓVEL',
  'rcf': 'AUTOMÓVEL',
  'rcfv': 'AUTOMÓVEL',
  'auto pf': 'AUTOMÓVEL',
  'auto pj': 'AUTOMÓVEL',
  'automovel': 'AUTOMÓVEL',
  'automóvel': 'AUTOMÓVEL',
  'pessoa física auto': 'AUTOMÓVEL',
  'veiculo': 'AUTOMÓVEL',
  'veículo': 'AUTOMÓVEL',
  'carro': 'AUTOMÓVEL',
  'moto': 'AUTOMÓVEL',
  'motocicleta': 'AUTOMÓVEL',
  'caminhão': 'AUTOMÓVEL',
  'caminhao': 'AUTOMÓVEL',
  'frota': 'AUTOMÓVEL',
  
  // Residencial
  'residencia habitual': 'RESIDENCIAL',
  'multi residencial': 'RESIDENCIAL',
  'incendio residencial': 'RESIDENCIAL',
  'residencia': 'RESIDENCIAL',
  'residência': 'RESIDENCIAL',
  'casa': 'RESIDENCIAL',
  'apartamento': 'RESIDENCIAL',
  'condominio': 'RESIDENCIAL',
  'condomínio': 'RESIDENCIAL',
  'lar': 'RESIDENCIAL',
  'moradia': 'RESIDENCIAL',
  
  // Vida
  'vida em grupo': 'VIDA',
  'vida individual': 'VIDA',
  'ap': 'VIDA',
  'acidentes pessoais': 'VIDA',
  'prestamista': 'VIDA',
  'invalidez': 'VIDA',
  'morte': 'VIDA',
  'funeral': 'VIDA',
  
  // Empresarial
  'empresarial compreensivo': 'EMPRESARIAL',
  'riscos nomeados': 'EMPRESARIAL',
  'comercial': 'EMPRESARIAL',
  'incendio comercial': 'EMPRESARIAL',
  'riscos operacionais': 'EMPRESARIAL',
  
  // Saúde
  'saude': 'SAÚDE',
  'saúde': 'SAÚDE',
  'odonto': 'SAÚDE',
  'dental': 'SAÚDE',
  'hospitalar': 'SAÚDE',
  'plano de saude': 'SAÚDE',
  
  // Viagem
  'viagem': 'VIAGEM',
  'travel': 'VIAGEM',
  'internacional': 'VIAGEM',
  'exterior': 'VIAGEM',
  
  // Garantia
  'fianca': 'GARANTIA',
  'fiança': 'GARANTIA',
  'locaticia': 'GARANTIA',
  'locatícia': 'GARANTIA',
  'fianca locaticia': 'GARANTIA',
  
  // Rural
  'rural': 'RURAL',
  'agricola': 'RURAL',
  'agrícola': 'RURAL',
  'safra': 'RURAL',
  'pecuario': 'RURAL',
  'pecuário': 'RURAL',
  'agro': 'RURAL',
  
  // Transporte
  'transporte': 'TRANSPORTE',
  'carga': 'TRANSPORTE',
  'rctr': 'TRANSPORTE',
  'rctr-c': 'TRANSPORTE',
  'embarcador': 'TRANSPORTE',
  'mercadoria': 'TRANSPORTE',
  
  // Responsabilidade Civil
  'responsabilidade civil': 'RESPONSABILIDADE CIVIL',
  'rc profissional': 'RESPONSABILIDADE CIVIL',
  'rc geral': 'RESPONSABILIDADE CIVIL',
  'd&o': 'RESPONSABILIDADE CIVIL',
  'e&o': 'RESPONSABILIDADE CIVIL',
  
  // Equipamentos
  'equipamentos': 'EQUIPAMENTOS',
  'eletronicos': 'EQUIPAMENTOS',
  'eletrônicos': 'EQUIPAMENTOS',
  'portateis': 'EQUIPAMENTOS',
  'portáteis': 'EQUIPAMENTOS',
  
  // Consórcio
  'consorcio': 'CONSÓRCIO',
  'consórcio': 'CONSÓRCIO',
};

export const RAMO_KEYWORDS: Record<string, string[]> = {
  'AUTOMÓVEL': ['PLACA', 'VEICULO', 'VEÍCULO', 'MARCA', 'MODELO', 'CHASSI', 'RCF', 'AUTO', 'CARRO', 'MOTO', 'CAMINHAO', 'FROTA', 'RENAVAM', 'BONUS', 'FIPE', 'COLISAO', 'ROUBO'],
  'RESIDENCIAL': ['RESIDENCIAL', 'RESIDENCIA', 'RESIDÊNCIA', 'CASA', 'APARTAMENTO', 'IMOVEL', 'IMÓVEL', 'INCENDIO', 'INCÊNDIO', 'MORADIA', 'CONDOMINIO', 'CONDOMÍNIO'],
  'VIDA': ['VIDA', 'INVALIDEZ', 'MORTE', 'FUNERAL', 'PRESTAMISTA', 'ACIDENTES PESSOAIS', 'BENEFICIARIO', 'CAPITAL SEGURADO', 'IPA', 'PECÚLIO'],
  'EMPRESARIAL': ['EMPRESARIAL', 'EMPRESA', 'COMERCIAL', 'CNPJ', 'ESTABELECIMENTO', 'RISCOS NOMEADOS', 'LUCROS CESSANTES', 'RC GERAL'],
  'SAÚDE': ['SAUDE', 'SAÚDE', 'MEDICO', 'MÉDICO', 'HOSPITALAR', 'ODONTO', 'PLANO', 'DENTAL', 'ANS'],
  'VIAGEM': ['VIAGEM', 'TRAVEL', 'INTERNACIONAL', 'EXTERIOR', 'BAGAGEM', 'CANCELAMENTO'],
  'GARANTIA': ['GARANTIA', 'FIANCA', 'FIANÇA', 'LOCATICIA', 'LOCATÍCIA', 'PERFORMANCE', 'JUDICIAL'],
  'TRANSPORTE': ['TRANSPORTE', 'CARGA', 'FRETE', 'MERCADORIA', 'EMBARCADOR', 'RCTR'],
  'RURAL': ['RURAL', 'AGRICOLA', 'AGRÍCOLA', 'SAFRA', 'PECUARIO', 'PECUÁRIO', 'AGRO'],
  'RESPONSABILIDADE CIVIL': ['RESPONSABILIDADE', 'RC', 'D&O', 'E&O', 'PROFISSIONAL', 'DIRECTORS', 'OFFICERS'],
};

// Marcas conhecidas de seguradoras (v2.1 - expandido)
const SEGURADORA_MARCAS = [
  'PORTO SEGURO', 'PORTO', 'HDI', 'TOKIO MARINE', 'TOKIO', 'ALLIANZ', 
  'BRADESCO', 'SULAMERICA', 'SULAMÉRICA', 'LIBERTY', 'MAPFRE', 'ZURICH',
  'AZUL SEGUROS', 'AZUL', 'SOMPO', 'ITAU', 'ITAÚ', 'CAIXA', 'BB SEGUROS',
  'ICATU', 'MITSUI', 'ALFA', 'YASUDA', 'MARITIMA', 'MARÍTIMA', 'SURA',
  'EXCELSIOR', 'JUNTO', 'GENERALI', 'AXA', 'FAIRFAX', 'POTTENCIAL',
  'ESSOR', 'SANCOR', 'AMERICAN', 'METLIFE', 'MONGERAL', 'PRUDENTIAL'
];

// Aliases para normalizar nomes de seguradoras (v2.1)
export const SEGURADORA_ALIASES: Record<string, string> = {
  'tokio marine kiln': 'TOKIO MARINE',
  'tokio marine': 'TOKIO MARINE',
  'tokio': 'TOKIO MARINE',
  'porto seguro cia': 'PORTO SEGURO',
  'porto seguro companhia': 'PORTO SEGURO',
  'porto': 'PORTO SEGURO',
  'hdi seguros': 'HDI',
  'hdi': 'HDI',
  'allianz seguros': 'ALLIANZ',
  'sulamerica seguros': 'SULAMÉRICA',
  'sulamerica': 'SULAMÉRICA',
  'liberty seguros': 'LIBERTY',
  'mapfre seguros': 'MAPFRE',
  'zurich seguros': 'ZURICH',
  'azul seguros': 'AZUL SEGUROS',
  'azul companhia': 'AZUL SEGUROS',
  'sompo seguros': 'SOMPO',
  'itau seguros': 'ITAÚ SEGUROS',
  'itaú seguros': 'ITAÚ SEGUROS',
  'bradesco seguros': 'BRADESCO',
  'bradesco auto': 'BRADESCO',
  'caixa seguradora': 'CAIXA',
  'bb seguros': 'BB SEGUROS',
  'banco do brasil seguros': 'BB SEGUROS',
  'icatu seguros': 'ICATU',
  'sura seguros': 'SURA',
  'junto seguros': 'JUNTO',
  'generali seguros': 'GENERALI',
  'pottencial seguros': 'POTTENCIAL',
};

/**
 * Normaliza nome de seguradora usando aliases
 */
export function normalizeSeguradora(nome: string | null): string | null {
  if (!nome) return null;
  const key = nome.toLowerCase().trim();
  return SEGURADORA_ALIASES[key] || nome.toUpperCase();
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Limpa CPF/CNPJ para apenas dígitos (v2.0)
 * Trata ruído de OCR: espaços, pontos extras, etc.
 */
export function cleanDocument(doc: string | null): string | null {
  if (!doc) return null;
  const digits = doc.replace(/\D/g, '');
  
  // Valida tamanho: CPF = 11, CNPJ = 14
  if (digits.length === 11 || digits.length === 14) {
    return digits;
  }
  // Tenta corrigir se tiver dígitos a mais/menos (ruído de OCR)
  if (digits.length === 10) {
    return '0' + digits; // CPF sem primeiro zero
  }
  if (digits.length === 13) {
    return '0' + digits; // CNPJ sem primeiro zero
  }
  return null;
}

/**
 * Converte valor monetário brasileiro para número
 * "1.234,56" → 1234.56
 */
export function parseMonetaryValue(value: string | null): number | null {
  if (!value) return null;
  
  // Remove R$ e espaços
  let clean = value.replace(/[R$\s]/g, '').trim();
  
  // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
  const hasCommaDecimal = /\d,\d{2}$/.test(clean);
  const hasDotDecimal = /\d\.\d{2}$/.test(clean);
  
  if (hasCommaDecimal) {
    // Formato brasileiro: remove pontos de milhar, troca vírgula por ponto
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (!hasDotDecimal && clean.includes(',')) {
    // Sem decimal claro, assume brasileiro
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Converte data brasileira (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
export function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Já está em formato ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Formato brasileiro DD/MM/YYYY ou DD-MM-YYYY
  const match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    // Validação básica
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

/**
 * Infere o ramo baseado em keywords no texto (v2.0)
 * Usa texto normalizado (UPPERCASE) para matching preciso
 */
export function inferRamoFromText(text: string): string | null {
  const normalizedText = text.toUpperCase();
  
  // Pontuação para cada ramo
  const scores: Record<string, number> = {};
  
  for (const [ramo, keywords] of Object.entries(RAMO_KEYWORDS)) {
    scores[ramo] = 0;
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        scores[ramo] += 1;
      }
    }
  }
  
  // Retorna ramo com maior pontuação (mínimo 2 keywords)
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] >= 2) {
    return sorted[0][0];
  }
  
  // Fallback: Detecção direta de placa = AUTOMÓVEL
  if (PLACA_MERCOSUL.test(normalizedText) || PLACA_ANTIGA.test(normalizedText)) {
    return 'AUTOMÓVEL';
  }
  
  return null;
}

/**
 * Normaliza nome do ramo usando aliases
 */
export function normalizeRamo(ramoExtraido: string | null): string | null {
  if (!ramoExtraido) return null;
  const key = ramoExtraido.toLowerCase().trim();
  return RAMO_ALIASES[key] || ramoExtraido.toUpperCase();
}

/**
 * Limpa nome de segurado (remove ruídos de OCR)
 */
function cleanNome(nome: string | null): string | null {
  if (!nome) return null;
  return nome
    .replace(/[^A-Z\u00C0-\u017F\s\-]/gi, '') // Remove caracteres inválidos
    .replace(/\s+/g, ' ')                       // Múltiplos espaços → um
    .trim()
    .substring(0, 100);
}

/**
 * Normaliza placa para formato padrão
 */
function normalizePlaca(placa: string | null): string | null {
  if (!placa) return null;
  const clean = placa.replace(/[\s\-]/g, '').toUpperCase();
  
  // Mercosul: ABC1D23 (7 chars, posição 4 é letra)
  if (clean.length === 7 && /^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean)) {
    return clean.substring(0, 3) + '-' + clean.substring(3);
  }
  
  // Antiga: ABC1234 (7 chars, posições 4-7 são dígitos)
  if (clean.length === 7 && /^[A-Z]{3}\d{4}$/.test(clean)) {
    return clean.substring(0, 3) + '-' + clean.substring(3);
  }
  
  return null;
}

// ============================================================
// CÁLCULO DE CONFIANÇA (v3.0 - NOVO)
// ============================================================

/**
 * Calcula score de confiança baseado em pesos (v3.0)
 * @param matchedFields Lista de campos encontrados
 * @returns Score de 0-100
 */
function calculateConfidence(matchedFields: string[]): number {
  let score = 0;
  
  for (const field of matchedFields) {
    // Mapeia campo para categoria de peso
    if (field.includes('cpf') || field.includes('cnpj')) {
      score += CONFIDENCE_WEIGHTS.cpf_cnpj;
    } else if (field.includes('apolice')) {
      score += CONFIDENCE_WEIGHTS.numero_apolice;
    } else if (field === 'placa') {
      score += CONFIDENCE_WEIGHTS.placa;
    } else if (field.includes('data_inicio')) {
      score += CONFIDENCE_WEIGHTS.data_inicio;
    } else if (field.includes('data_fim')) {
      score += CONFIDENCE_WEIGHTS.data_fim;
    } else if (field.includes('premio')) {
      score += CONFIDENCE_WEIGHTS.premio_liquido;
    } else if (field.includes('nome_segurado')) {
      score += CONFIDENCE_WEIGHTS.nome_segurado;
    } else if (field.includes('seguradora')) {
      score += CONFIDENCE_WEIGHTS.seguradora;
    } else if (field.includes('ramo')) {
      score += CONFIDENCE_WEIGHTS.ramo;
    } else if (field === 'chassi') {
      score += CONFIDENCE_WEIGHTS.chassi;
    } else if (field === 'marca') {
      score += CONFIDENCE_WEIGHTS.marca;
    } else if (field === 'modelo') {
      score += CONFIDENCE_WEIGHTS.modelo;
    } else if (field === 'ano') {
      score += CONFIDENCE_WEIGHTS.ano;
    } else if (field === 'email') {
      score += CONFIDENCE_WEIGHTS.email;
    } else if (field === 'telefone') {
      score += CONFIDENCE_WEIGHTS.telefone;
    } else if (field === 'cep') {
      score += CONFIDENCE_WEIGHTS.cep;
    }
  }
  
  return Math.min(100, score);
}

// ============================================================
// PARSER PRINCIPAL (v3.0 - Sliding Window + Confidence Weights)
// ============================================================

export function parsePolicy(rawText: string, fileName?: string): ParsedPolicy {
  const matchedFields: string[] = [];
  const normalized = normalizeOcrText(rawText);
  
  console.log(`🔍 [PARSER v3.0] Texto normalizado: ${normalized.length} caracteres`);
  
  // --- CPF/CNPJ (Sliding Window com 150 char radius) ---
  let cpfCnpj: string | null = null;
  
  // Tenta CPF primeiro
  const cpfRaw = extractByAnchor(normalized, ANCHORS.cpf, CPF_PATTERN, 150);
  if (cpfRaw) {
    cpfCnpj = cleanDocument(cpfRaw);
    if (cpfCnpj) matchedFields.push('cpf_anchor');
  }
  
  // Tenta CNPJ se não achou CPF
  if (!cpfCnpj) {
    const cnpjRaw = extractByAnchor(normalized, ANCHORS.cnpj, CNPJ_PATTERN, 150);
    if (cnpjRaw) {
      cpfCnpj = cleanDocument(cnpjRaw);
      if (cpfCnpj) matchedFields.push('cnpj_anchor');
    }
  }
  
  // Fallback: busca global por padrão de CPF/CNPJ
  if (!cpfCnpj) {
    const globalCpf = globalSearch(normalized, CPF_PATTERN);
    if (globalCpf) {
      cpfCnpj = cleanDocument(globalCpf);
      if (cpfCnpj) matchedFields.push('cpf_global');
    }
  }
  
  // --- Nome do Segurado ---
  let nomeCliente = extractByAnchor(normalized, ANCHORS.segurado, NOME_PATTERN, 100);
  nomeCliente = cleanNome(nomeCliente);
  if (nomeCliente && nomeCliente.length >= 5) {
    matchedFields.push('nome_segurado');
  }
  
  // --- Email (busca global) ---
  let email = globalSearch(rawText, EMAIL_PATTERN); // Usa texto original para case-sensitivity
  if (email) {
    email = email.toLowerCase();
    matchedFields.push('email');
  }
  
  // --- Telefone ---
  let telefone = globalSearch(normalized, TELEFONE_PATTERN);
  if (telefone) {
    telefone = telefone.replace(/\D/g, '');
    if (telefone.length >= 10 && telefone.length <= 11) {
      matchedFields.push('telefone');
    } else {
      telefone = null;
    }
  }
  
  // --- Número da Apólice ---
  let numeroApolice = extractByAnchor(normalized, ANCHORS.apolice, APOLICE_PATTERN, 80);
  if (numeroApolice) matchedFields.push('numero_apolice');
  
  // --- Número da Proposta ---
  let numeroProposta = extractByAnchor(normalized, ANCHORS.proposta, APOLICE_PATTERN, 80);
  if (numeroProposta) matchedFields.push('numero_proposta');
  
  // --- Seguradora (detecção de marca conhecida + normalização) ---
  let nomeSeguradora: string | null = null;
  for (const marca of SEGURADORA_MARCAS) {
    if (normalized.includes(marca)) {
      nomeSeguradora = normalizeSeguradora(marca);
      matchedFields.push('seguradora_marca');
      break;
    }
  }
  // Fallback: anchor search
  if (!nomeSeguradora) {
    const seguradoraRaw = extractByAnchor(normalized, ANCHORS.seguradora, /([A-Z\s]{5,40})/i, 60);
    if (seguradoraRaw) {
      nomeSeguradora = normalizeSeguradora(seguradoraRaw.substring(0, 40).trim());
      matchedFields.push('seguradora_anchor');
    }
  }
  
  // --- Datas de Vigência ---
  let dataInicio = extractByAnchor(normalized, ANCHORS.vigencia_inicio, DATA_PATTERN, 50);
  dataInicio = parseDate(dataInicio);
  if (dataInicio) matchedFields.push('data_inicio');
  
  let dataFim = extractByAnchor(normalized, ANCHORS.vigencia_fim, DATA_PATTERN, 50);
  dataFim = parseDate(dataFim);
  if (dataFim) matchedFields.push('data_fim');
  
  // Fallback: busca par de datas DD/MM/YYYY a DD/MM/YYYY
  if (!dataInicio || !dataFim) {
    const parDatas = normalized.match(/(\d{2}[\/-]\d{2}[\/-]\d{4})\s*(?:A|À|ATE|ATÉ|[\-–])\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/);
    if (parDatas) {
      if (!dataInicio) {
        dataInicio = parseDate(parDatas[1]);
        if (dataInicio) matchedFields.push('data_inicio_par');
      }
      if (!dataFim) {
        dataFim = parseDate(parDatas[2]);
        if (dataFim) matchedFields.push('data_fim_par');
      }
    }
  }
  
  // --- Valores ---
  let premioLiquido: number | null = null;
  const liquidoRaw = extractByAnchor(normalized, ANCHORS.premio_liquido, VALOR_PATTERN, 80);
  if (liquidoRaw) {
    premioLiquido = parseMonetaryValue(liquidoRaw);
    if (premioLiquido) matchedFields.push('premio_liquido');
  }
  
  let premioTotal: number | null = null;
  const totalRaw = extractByAnchor(normalized, ANCHORS.premio_total, VALOR_PATTERN, 80);
  if (totalRaw) {
    premioTotal = parseMonetaryValue(totalRaw);
    if (premioTotal) matchedFields.push('premio_total');
  }
  
  // Fallback: busca valores monetários globais
  if (!premioLiquido && !premioTotal) {
    const valoresGlobais = [...normalized.matchAll(/R?\$\s*([\d.,]+)/g)];
    const valores = valoresGlobais
      .map(m => parseMonetaryValue(m[1]))
      .filter((v): v is number => v !== null && v > 50)
      .sort((a, b) => b - a);
    
    if (valores.length >= 1) {
      premioTotal = valores[0];
      premioLiquido = valores[1] || valores[0];
      matchedFields.push('valores_global');
    }
  }
  
  // --- Placa (busca global - placas aparecem em qualquer lugar) ---
  let placa: string | null = null;
  const placaMercosul = globalSearch(normalized, PLACA_MERCOSUL);
  const placaAntiga = globalSearch(normalized, PLACA_ANTIGA);
  
  placa = normalizePlaca(placaMercosul) || normalizePlaca(placaAntiga);
  if (placa) matchedFields.push('placa');
  
  // --- Chassi ---
  let chassi = extractByAnchor(normalized, ANCHORS.chassi, CHASSI_PATTERN, 50);
  if (!chassi) {
    chassi = globalSearch(normalized, CHASSI_PATTERN);
  }
  if (chassi && chassi.length === 17) {
    matchedFields.push('chassi');
  } else {
    chassi = null;
  }
  
  // --- Marca/Modelo/Ano ---
  const marca = extractByAnchor(normalized, ANCHORS.marca, /([A-Z]{3,20})/i, 40);
  const modelo = extractByAnchor(normalized, ANCHORS.modelo, /([A-Z0-9\s\-\.]{3,30})/i, 50);
  let anoFabricacao: number | null = null;
  let anoModelo: number | null = null;
  
  const anoRaw = extractByAnchor(normalized, ANCHORS.ano, /(\d{4})[\/\s]*(\d{4})?/, 30);
  if (anoRaw) {
    const anoMatch = anoRaw.match(/(\d{4})[\/\s]*(\d{4})?/);
    if (anoMatch) {
      anoFabricacao = parseInt(anoMatch[1]);
      anoModelo = anoMatch[2] ? parseInt(anoMatch[2]) : anoFabricacao;
      if (anoFabricacao >= 1980 && anoFabricacao <= 2030) {
        matchedFields.push('ano');
      } else {
        anoFabricacao = null;
        anoModelo = null;
      }
    }
  }
  
  if (marca) matchedFields.push('marca');
  if (modelo) matchedFields.push('modelo');
  
  // --- Inferência de Ramo ---
  let ramoSeguro = inferRamoFromText(normalized);
  if (ramoSeguro) matchedFields.push('ramo_inferido');
  
  // Auto-detect AUTOMÓVEL se tem placa ou chassi
  if (!ramoSeguro && (placa || chassi)) {
    ramoSeguro = 'AUTOMÓVEL';
    matchedFields.push('ramo_auto_placa');
  }
  
  // --- Objeto Segurado ---
  let objetoSegurado: string | null = null;
  if (placa || marca || modelo) {
    const partes = [marca, modelo, anoModelo ? String(anoModelo) : null].filter(Boolean);
    objetoSegurado = partes.length > 0 
      ? `${partes.join(' ')}${placa ? ` - Placa: ${placa}` : ''}`
      : (placa ? `Veículo - Placa: ${placa}` : null);
  }
  
  // --- Endereço/CEP ---
  let endereco: string | null = null;
  const cepMatch = normalized.match(/CEP[\s:]*(\d{5}[\-\s]?\d{3})/);
  if (cepMatch) {
    endereco = `CEP: ${cepMatch[1].replace(/[\s\-]/g, '-')}`;
    matchedFields.push('cep');
  }
  
  // --- Cálculo de Confiança (v3.0 - Sistema de Pesos) ---
  const confidence = calculateConfidence(matchedFields);
  
  console.log(`🔍 [PARSER v3.0] Confiança: ${confidence}% (threshold: ${CONFIDENCE_THRESHOLD}%), Campos: ${matchedFields.join(', ')}`);
  
  return {
    nome_cliente: nomeCliente,
    cpf_cnpj: cpfCnpj,
    email,
    telefone,
    endereco_completo: endereco,
    numero_apolice: numeroApolice,
    numero_proposta: numeroProposta,
    nome_seguradora: nomeSeguradora,
    ramo_seguro: ramoSeguro,
    data_inicio: dataInicio,
    data_fim: dataFim,
    objeto_segurado: objetoSegurado,
    placa,
    chassi,
    marca: marca || null,
    modelo: modelo || null,
    ano_fabricacao: anoFabricacao,
    ano_modelo: anoModelo,
    premio_liquido: premioLiquido,
    premio_total: premioTotal,
    confidence,
    matched_fields: matchedFields,
    arquivo_origem: fileName,
  };
}

/**
 * Alias para compatibilidade
 */
export function parsePolicyFromText(rawText: string, fileName?: string): ParsedPolicy {
  return parsePolicy(rawText, fileName);
}
