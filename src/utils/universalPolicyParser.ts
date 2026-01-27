/**
 * Parser Universal para Extração de Dados de Apólices
 * Arquitetura: OCR → Regex Ancorado → Dados Estruturados
 * Zero dependência de IA - 100% determinístico
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
// PADRÕES REGEX ANCORADOS - SEGURADORAS BRASILEIRAS
// ============================================================

const PATTERNS = {
  // CPF: aceita 000.000.000-00 ou 00000000000
  cpf: /(?:CPF|C\.P\.F|CPF\/MF)[\s:]*(\d{3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?\d{2})/i,
  cpf_standalone: /\b(\d{3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?\d{2})\b/,
  
  // CNPJ: aceita 00.000.000/0000-00 ou 00000000000000
  cnpj: /(?:CNPJ|C\.N\.P\.J)[\s:]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\s\/]?\d{4}[\-\s]?\d{2})/i,
  cnpj_standalone: /\b(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\s\/]?\d{4}[\-\s]?\d{2})\b/,
  
  // Placa Mercosul ou antiga
  placa: /(?:PLACA|Placa)[\s:]*([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})/i,
  placa_standalone: /\b([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})\b/i,
  
  // Chassi
  chassi: /(?:CHASSI|Chassi|CHASSIS)[\s:]*([A-HJ-NPR-Z0-9]{17})/i,
  
  // Número da Apólice (5-15 dígitos)
  apolice: /(?:N[º°]?\s*(?:da\s+)?Ap[óo]lice|APÓLICE|APOLICE|Apólice\s*(?:Nº|N\.)?)[\s:]*(\d{5,20})/i,
  apolice_fallback: /(?:Ap[óo]lice)[\s:\/]*(\d{5,15})/i,
  
  // Número da Proposta
  proposta: /(?:N[º°]?\s*(?:da\s+)?Proposta|PROPOSTA|Proposta\s*(?:Nº|N\.)?)[\s:]*(\d{5,20})/i,
  
  // Prêmio Líquido (R$ 1.234,56 ou 1234.56)
  premio_liquido: /(?:Prêmio|Premio|PRÊMIO|PREMIO)\s*(?:Líquido|LÍQUIDO|Liquido|LIQUIDO)[\s:R$]*([\d.,]+)/i,
  
  // Prêmio Total
  premio_total: /(?:Prêmio|Premio|PRÊMIO|PREMIO)\s*(?:Total|TOTAL)[\s:R$]*([\d.,]+)/i,
  
  // Valores monetários genéricos (fallback)
  valor_monetario: /R\$\s*([\d.,]+)/g,
  
  // Data início (múltiplos formatos)
  data_inicio: /(?:Início\s*(?:de\s*)?Vigência|Vigência\s*(?:de|início|a\s*partir)|Data\s*Início|Início)[\s:]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i,
  
  // Data fim
  data_fim: /(?:Término|Fim\s*(?:de\s*)?Vigência|Vigência\s*até|Até|Vencimento|Final\s*Vigência)[\s:]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i,
  
  // Datas genéricas (captura par de datas)
  datas_vigencia: /(\d{2}[\/-]\d{2}[\/-]\d{4})\s*(?:a|à|até|[\-–])\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i,
  
  // Nome do Segurado (captura até quebra de linha)
  nome_segurado: /(?:Segurado|Titular|Estipulante|Proponente|SEGURADO|PROPONENTE)[\s:]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇa-záàâãéèêíìîóòôõúùûç\s]{4,60})/i,
  
  // Seguradora
  seguradora: /(?:Seguradora|Companhia|Cia|SEGURADORA|CIA)[\s:]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇa-záàâãéèêíìîóòôõúùûç\s]+(?:S\.?A\.?|SEGUROS|Seguros)?)/i,
  
  // Marcas conhecidas de seguradoras
  seguradora_marca: /\b(Porto\s*Seguro|HDI|Tokio\s*Marine|Allianz|Bradesco|SulAmérica|Sulamerica|Liberty|Mapfre|Zurich|Azul\s*Seguros|Sompo|Itaú|Caixa|BB\s*Seguros|Icatu|Mitsui|Alfa)\b/i,
  
  // Email
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  
  // Telefone (formato brasileiro)
  telefone: /(?:\(?\d{2}\)?\s*)?(?:9\s?)?\d{4}[\-\s]?\d{4}/,
  telefone_celular: /\(?\d{2}\)?\s*9\d{4}[\-\s]?\d{4}/,
  
  // CEP
  cep: /(?:CEP|Cep)[\s:]*(\d{5}[\-\s]?\d{3})/i,
  
  // Marca do veículo
  marca_veiculo: /(?:Marca|MARCA)[\s:]*([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-Za-z\s]{2,20})/i,
  
  // Modelo do veículo
  modelo_veiculo: /(?:Modelo|MODELO)[\s:]*([A-Za-z0-9\s\-\.]{2,30})/i,
  
  // Ano do veículo
  ano_veiculo: /(?:Ano|ANO)[\s:\/]*(\d{4})[\s\/]*(\d{4})?/i,
};

// ============================================================
// ALIASES E INFERÊNCIA DE RAMO
// ============================================================

const RAMO_ALIASES: Record<string, string> = {
  'rcf-v': 'AUTOMÓVEL',
  'rcf': 'AUTOMÓVEL',
  'rcfv': 'AUTOMÓVEL',
  'auto pf': 'AUTOMÓVEL',
  'auto pj': 'AUTOMÓVEL',
  'automovel': 'AUTOMÓVEL',
  'pessoa física auto': 'AUTOMÓVEL',
  'veiculo': 'AUTOMÓVEL',
  'carro': 'AUTOMÓVEL',
  'moto': 'AUTOMÓVEL',
  'residencia habitual': 'RESIDENCIAL',
  'multi residencial': 'RESIDENCIAL',
  'incendio residencial': 'RESIDENCIAL',
  'residencia': 'RESIDENCIAL',
  'casa': 'RESIDENCIAL',
  'apartamento': 'RESIDENCIAL',
  'vida em grupo': 'VIDA',
  'ap': 'VIDA',
  'acidentes pessoais': 'VIDA',
  'prestamista': 'VIDA',
  'invalidez': 'VIDA',
  'empresarial compreensivo': 'EMPRESARIAL',
  'riscos nomeados': 'EMPRESARIAL',
  'comercial': 'EMPRESARIAL',
  'saude': 'SAÚDE',
  'odonto': 'SAÚDE',
  'dental': 'SAÚDE',
  'hospitalar': 'SAÚDE',
  'viagem': 'VIAGEM',
  'travel': 'VIAGEM',
  'fianca': 'GARANTIA',
  'locaticia': 'GARANTIA',
  'rural': 'RURAL',
  'agricola': 'RURAL',
  'transporte': 'TRANSPORTE',
  'carga': 'TRANSPORTE',
  'rctr': 'TRANSPORTE',
};

const RAMO_KEYWORDS: Record<string, string[]> = {
  'AUTOMÓVEL': ['placa', 'veículo', 'veiculo', 'marca', 'modelo', 'chassi', 'rcf', 'auto', 'carro', 'moto', 'caminhão', 'frota', 'renavam', 'bonus'],
  'RESIDENCIAL': ['residencial', 'residência', 'residencia', 'casa', 'apartamento', 'imóvel', 'imovel', 'incêndio', 'incendio', 'moradia', 'condomínio'],
  'VIDA': ['vida', 'invalidez', 'morte', 'funeral', 'prestamista', 'acidentes pessoais', 'beneficiário', 'beneficiario', 'capital segurado'],
  'EMPRESARIAL': ['empresarial', 'empresa', 'comercial', 'cnpj', 'estabelecimento', 'riscos nomeados', 'lucros cessantes', 'rc geral'],
  'SAÚDE': ['saúde', 'saude', 'médico', 'medico', 'hospitalar', 'odonto', 'plano', 'dental', 'ans'],
  'VIAGEM': ['viagem', 'travel', 'internacional', 'exterior', 'bagagem', 'cancelamento'],
  'GARANTIA': ['garantia', 'fiança', 'fianca', 'locatícia', 'locaticia', 'performance', 'judicial'],
  'TRANSPORTE': ['transporte', 'carga', 'frete', 'mercadoria', 'embarcador', 'rctr'],
  'RURAL': ['rural', 'agrícola', 'agricola', 'safra', 'pecuário', 'pecuario', 'agro'],
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Limpa CPF/CNPJ para apenas dígitos
 */
function cleanDocument(doc: string | null): string | null {
  if (!doc) return null;
  const digits = doc.replace(/\D/g, '');
  return (digits.length === 11 || digits.length === 14) ? digits : null;
}

/**
 * Converte valor monetário brasileiro para número
 * "1.234,56" → 1234.56
 */
function parseMonetaryValue(value: string | null): number | null {
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
  return isNaN(num) ? null : num;
}

/**
 * Converte data brasileira (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Já está em formato ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Formato brasileiro DD/MM/YYYY ou DD-MM-YYYY
  const match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Infere o ramo baseado em keywords no texto
 */
function inferRamoFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Pontuação para cada ramo
  const scores: Record<string, number> = {};
  
  for (const [ramo, keywords] of Object.entries(RAMO_KEYWORDS)) {
    scores[ramo] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        scores[ramo] += 1;
      }
    }
  }
  
  // Retorna ramo com maior pontuação (mínimo 2 keywords)
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] >= 2) {
    return sorted[0][0];
  }
  
  // Fallback: se tem placa, é AUTOMÓVEL
  if (PATTERNS.placa_standalone.test(text)) {
    return 'AUTOMÓVEL';
  }
  
  return null;
}

/**
 * Normaliza nome do ramo usando aliases
 */
function normalizeRamo(ramoExtraido: string | null): string | null {
  if (!ramoExtraido) return null;
  const key = ramoExtraido.toLowerCase().trim();
  return RAMO_ALIASES[key] || ramoExtraido.toUpperCase();
}

/**
 * Limpa nome de segurado (remove ruídos)
 */
function cleanNome(nome: string | null): string | null {
  if (!nome) return null;
  return nome
    .replace(/\s+/g, ' ')
    .replace(/[^\wÀ-ÿ\s\-]/g, '')
    .trim()
    .substring(0, 100);
}

// ============================================================
// PARSER PRINCIPAL
// ============================================================

export function parsePolicy(rawText: string, fileName?: string): ParsedPolicy {
  const matchedFields: string[] = [];
  
  // --- CPF/CNPJ ---
  let cpfCnpj: string | null = null;
  let cpfMatch = rawText.match(PATTERNS.cpf);
  if (cpfMatch) {
    cpfCnpj = cleanDocument(cpfMatch[1]);
    if (cpfCnpj) matchedFields.push('cpf');
  }
  
  if (!cpfCnpj) {
    const cnpjMatch = rawText.match(PATTERNS.cnpj);
    if (cnpjMatch) {
      cpfCnpj = cleanDocument(cnpjMatch[1]);
      if (cpfCnpj) matchedFields.push('cnpj');
    }
  }
  
  // Fallback: busca standalone se não encontrou ancorado
  if (!cpfCnpj) {
    const standaloneMatch = rawText.match(PATTERNS.cpf_standalone);
    if (standaloneMatch) {
      cpfCnpj = cleanDocument(standaloneMatch[1]);
      if (cpfCnpj) matchedFields.push('cpf_standalone');
    }
  }
  
  // --- Nome do Segurado ---
  let nomeCliente: string | null = null;
  const nomeMatch = rawText.match(PATTERNS.nome_segurado);
  if (nomeMatch) {
    nomeCliente = cleanNome(nomeMatch[1]);
    if (nomeCliente) matchedFields.push('nome_segurado');
  }
  
  // --- Email ---
  let email: string | null = null;
  const emailMatch = rawText.match(PATTERNS.email);
  if (emailMatch) {
    email = emailMatch[1].toLowerCase();
    matchedFields.push('email');
  }
  
  // --- Telefone ---
  let telefone: string | null = null;
  const telMatch = rawText.match(PATTERNS.telefone_celular) || rawText.match(PATTERNS.telefone);
  if (telMatch) {
    telefone = telMatch[0].replace(/\D/g, '');
    if (telefone.length >= 10) matchedFields.push('telefone');
    else telefone = null;
  }
  
  // --- Número da Apólice ---
  let numeroApolice: string | null = null;
  const apoliceMatch = rawText.match(PATTERNS.apolice) || rawText.match(PATTERNS.apolice_fallback);
  if (apoliceMatch) {
    numeroApolice = apoliceMatch[1];
    matchedFields.push('numero_apolice');
  }
  
  // --- Número da Proposta ---
  let numeroProposta: string | null = null;
  const propostaMatch = rawText.match(PATTERNS.proposta);
  if (propostaMatch) {
    numeroProposta = propostaMatch[1];
    matchedFields.push('numero_proposta');
  }
  
  // --- Seguradora ---
  let nomeSeguradora: string | null = null;
  const segMatch = rawText.match(PATTERNS.seguradora_marca);
  if (segMatch) {
    nomeSeguradora = segMatch[1].trim();
    matchedFields.push('seguradora_marca');
  } else {
    const segGeneric = rawText.match(PATTERNS.seguradora);
    if (segGeneric) {
      nomeSeguradora = segGeneric[1].trim().substring(0, 50);
      matchedFields.push('seguradora');
    }
  }
  
  // --- Datas de Vigência ---
  let dataInicio: string | null = null;
  let dataFim: string | null = null;
  
  // Tenta par de datas primeiro
  const datasParMatch = rawText.match(PATTERNS.datas_vigencia);
  if (datasParMatch) {
    dataInicio = parseDate(datasParMatch[1]);
    dataFim = parseDate(datasParMatch[2]);
    if (dataInicio && dataFim) matchedFields.push('vigencia_par');
  }
  
  // Fallback para datas individuais
  if (!dataInicio) {
    const inicioMatch = rawText.match(PATTERNS.data_inicio);
    if (inicioMatch) {
      dataInicio = parseDate(inicioMatch[1]);
      if (dataInicio) matchedFields.push('data_inicio');
    }
  }
  
  if (!dataFim) {
    const fimMatch = rawText.match(PATTERNS.data_fim);
    if (fimMatch) {
      dataFim = parseDate(fimMatch[1]);
      if (dataFim) matchedFields.push('data_fim');
    }
  }
  
  // --- Valores ---
  let premioLiquido: number | null = null;
  let premioTotal: number | null = null;
  
  const liquidoMatch = rawText.match(PATTERNS.premio_liquido);
  if (liquidoMatch) {
    premioLiquido = parseMonetaryValue(liquidoMatch[1]);
    if (premioLiquido) matchedFields.push('premio_liquido');
  }
  
  const totalMatch = rawText.match(PATTERNS.premio_total);
  if (totalMatch) {
    premioTotal = parseMonetaryValue(totalMatch[1]);
    if (premioTotal) matchedFields.push('premio_total');
  }
  
  // Fallback: busca valores monetários genéricos
  if (!premioLiquido && !premioTotal) {
    const valoresMatch = rawText.matchAll(PATTERNS.valor_monetario);
    const valores = [...valoresMatch].map(m => parseMonetaryValue(m[1])).filter(v => v && v > 100) as number[];
    if (valores.length >= 1) {
      // Maior valor = total, menor = líquido (heurística)
      valores.sort((a, b) => b - a);
      premioTotal = valores[0] || null;
      premioLiquido = valores[1] || valores[0] || null;
      if (premioLiquido) matchedFields.push('valores_fallback');
    }
  }
  
  // --- Placa ---
  let placa: string | null = null;
  const placaMatch = rawText.match(PATTERNS.placa) || rawText.match(PATTERNS.placa_standalone);
  if (placaMatch) {
    placa = placaMatch[1].toUpperCase().replace(/[\s\-]/g, '-');
    // Normaliza para formato XXX-0X00
    if (placa.length === 7 && !placa.includes('-')) {
      placa = placa.substring(0, 3) + '-' + placa.substring(3);
    }
    matchedFields.push('placa');
  }
  
  // --- Chassi ---
  let chassi: string | null = null;
  const chassiMatch = rawText.match(PATTERNS.chassi);
  if (chassiMatch) {
    chassi = chassiMatch[1].toUpperCase();
    matchedFields.push('chassi');
  }
  
  // --- Marca/Modelo/Ano ---
  let marca: string | null = null;
  let modelo: string | null = null;
  let anoFabricacao: number | null = null;
  let anoModelo: number | null = null;
  
  const marcaMatch = rawText.match(PATTERNS.marca_veiculo);
  if (marcaMatch) {
    marca = marcaMatch[1].trim();
    matchedFields.push('marca');
  }
  
  const modeloMatch = rawText.match(PATTERNS.modelo_veiculo);
  if (modeloMatch) {
    modelo = modeloMatch[1].trim();
    matchedFields.push('modelo');
  }
  
  const anoMatch = rawText.match(PATTERNS.ano_veiculo);
  if (anoMatch) {
    anoFabricacao = parseInt(anoMatch[1]);
    anoModelo = anoMatch[2] ? parseInt(anoMatch[2]) : anoFabricacao;
    matchedFields.push('ano');
  }
  
  // --- Ramo ---
  let ramoSeguro = inferRamoFromText(rawText);
  if (ramoSeguro) matchedFields.push('ramo_inferido');
  
  // --- Objeto Segurado ---
  let objetoSegurado: string | null = null;
  if (placa || marca || modelo) {
    // Veículo
    const partes = [marca, modelo, anoModelo ? String(anoModelo) : null].filter(Boolean);
    objetoSegurado = partes.length > 0 
      ? `${partes.join(' ')}${placa ? ` - Placa: ${placa}` : ''}`
      : (placa ? `Veículo - Placa: ${placa}` : null);
    if (!ramoSeguro) ramoSeguro = 'AUTOMÓVEL';
  }
  
  // --- CEP (para endereço) ---
  let endereco: string | null = null;
  const cepMatch = rawText.match(PATTERNS.cep);
  if (cepMatch) {
    endereco = `CEP: ${cepMatch[1]}`;
    matchedFields.push('cep');
  }
  
  // --- Cálculo de Confiança ---
  const essentialFields = ['cpf', 'cnpj', 'cpf_standalone', 'numero_apolice', 'nome_segurado'];
  const essentialMatched = matchedFields.filter(f => essentialFields.some(e => f.includes(e))).length;
  const confidence = Math.min(100, (matchedFields.length * 8) + (essentialMatched * 15));
  
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
    marca,
    modelo,
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

// ============================================================
// EXPORTAÇÕES AUXILIARES
// ============================================================

export { 
  inferRamoFromText, 
  normalizeRamo, 
  cleanDocument, 
  parseMonetaryValue, 
  parseDate,
  RAMO_ALIASES,
  RAMO_KEYWORDS 
};
