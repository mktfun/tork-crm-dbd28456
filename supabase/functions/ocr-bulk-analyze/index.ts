import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OCR_SPACE_KEY = 'K82045193188957';

// ✅ Função ULTRA-SEGURA para converter Uint8Array para Base64 (loop byte-a-byte)
// MOTIVO: String.fromCharCode.apply() e spread operator (...) estouram a pilha
// em arrays > 65.536 elementos. Este loop é O(n) e não usa recursão.
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Loop byte-a-byte: NUNCA estoura a pilha, independente do tamanho
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Limite máximo para envio ao OCR.space (512KB)
const MAX_OCR_SIZE = 512 * 1024;

// Keywords para validar qualidade do texto
const KEYWORDS = [
  'NOME', 'CPF', 'CNPJ', 'SEGURADO', 'TITULAR', 'ESTIPULANTE',
  'APOLICE', 'PROPOSTA', 'ORCAMENTO', 'ENDOSSO', 'RENOVACAO',
  'VIGENCIA', 'INICIO', 'TERMINO', 'FIM', 'VALIDADE',
  'PREMIO', 'LIQUIDO', 'TOTAL', 'IOF', 'VALOR', 'PARCELA',
  'RAMO', 'SEGURADORA', 'COBERTURA', 'FRANQUIA',
  'PLACA', 'MARCA', 'MODELO', 'VEICULO', 'CHASSI',
  'RESIDENCIAL', 'IMOVEL', 'VIDA', 'EMPRESA'
];

// Avalia qualidade do texto extraído
function evaluateTextQuality(text: string): { score: number; keywordHits: number } {
  const upperText = text.toUpperCase();
  const keywordHits = KEYWORDS.filter(kw => upperText.includes(kw)).length;
  const digitMatches = text.match(/\d/g) || [];
  const monetaryMatches = text.match(/R\$\s*[\d.,]+|\d{1,3}[.]\d{3}[,]\d{2}/g) || [];
  const digitRatio = (digitMatches.length + monetaryMatches.length * 10) / Math.max(text.length, 1);
  const score = (keywordHits * 5) + (digitRatio * 100);
  return { score, keywordHits };
}

// Filtra linhas essenciais do texto
function filterEssentialText(text: string, maxChars: number = 15000): string {
  const lines = text.split('\n');
  const relevantLines: Set<string> = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    const hasKeyword = KEYWORDS.some(kw => upperLine.includes(kw));
    const hasPattern = /\d{3}[.\-]\d{3}[.\-]\d{3}[.\-]\d{2}|\d{2}\/\d{2}\/\d{4}|R\$\s*[\d.,]+/.test(line);
    const hasPlaca = /[A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2}|[A-Z]{3}\d{4}/i.test(line);
    
    if (hasKeyword || hasPattern || hasPlaca) {
      if (i > 0 && lines[i - 1].trim()) relevantLines.add(lines[i - 1]);
      relevantLines.add(line);
      if (i < lines.length - 1 && lines[i + 1].trim()) relevantLines.add(lines[i + 1]);
    }
  }
  
  const filtered = Array.from(relevantLines).join('\n').substring(0, maxChars);
  
  if (filtered.length < 100 && text.length > 100) {
    console.log('⚠️ [FILTRO] Muito agressivo, usando texto original');
    return text.substring(0, maxChars);
  }
  
  return filtered;
}

// Extração local de texto via regex (fallback)
function extractTextFromPdfBuffer(buffer: Uint8Array): string {
  try {
    const decoder = new TextDecoder('latin1');
    const pdfString = decoder.decode(buffer);
    const textMatches: string[] = [];
    
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(pdfString)) !== null) {
      const textBlock = match[1];
      const stringRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = stringRegex.exec(textBlock)) !== null) {
        if (strMatch[1].trim()) textMatches.push(strMatch[1]);
      }
    }
    
    return textMatches.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

// =============================================================================
// v6.1 POST-PROCESSING CLEAN: Remove garbage values after AI extraction
// =============================================================================
const GARBAGE_PATTERNS = [
  /^man\s*ual$/i,
  /^aut(omatico|o)?$/i,
  /^modelo$/i,
  /^versao$/i,
  /^versão$/i,
  /^segurado$/i,
  /^titular$/i,
  /^estipulante$/i,
  /^proponente$/i,
  /^ramo$/i,
  /^proposta$/i,
  /^apolice$/i,
  /^apólice$/i,
  /^item$/i,
  /^veiculo$/i,
  /^veículo$/i,
  /^condutor$/i,
  /^principal$/i,
  /^cliente$/i,
  /^nome$/i,
  /^cpf$/i,
  /^cnpj$/i,
  /^n[°º]?$/i,
  /^nr$/i,
  /^ra$/i,
  /^sp$/i,
  /^rj$/i,
  /^mg$/i,
  /^\d{1,3}$/,  // Numbers with 1-3 digits only
];

function cleanGarbageValue(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.toString().trim();
  
  // Too short = garbage
  if (trimmed.length < 3) {
    console.log(`🧹 [POST-CLEAN] Removendo valor muito curto: "${trimmed}"`);
    return null;
  }
  
  // Contains suspicious space in middle of word (like "man ual")
  if (/^[a-z]{1,4}\s+[a-z]{1,4}$/i.test(trimmed) && trimmed.length < 12) {
    console.log(`🧹 [POST-CLEAN] Removendo OCR com espaço suspeito: "${trimmed}"`);
    return null;
  }
  
  // Match against garbage patterns
  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.log(`🧹 [POST-CLEAN] Removendo garbage match: "${trimmed}"`);
      return null;
    }
  }
  
  return trimmed;
}

function postProcessExtractedPolicy(policy: any): any {
  // Fields that should never have garbage values
  const fieldsToClean = [
    'numero_apolice',
    'numero_proposta',
    'objeto_segurado',
    'identificacao_adicional',
  ];
  
  for (const field of fieldsToClean) {
    if (policy[field]) {
      const original = policy[field];
      const cleaned = cleanGarbageValue(original);
      if (cleaned !== original) {
        console.log(`🧹 [POST-CLEAN] ${field}: "${original}" → ${cleaned === null ? 'null' : `"${cleaned}"`}`);
        policy[field] = cleaned;
      }
    }
  }
  
  // Special handling for nome_cliente - more aggressive cleaning
  if (policy.nome_cliente) {
    let nome = policy.nome_cliente.toString().trim();
    
    // Remove garbage suffixes/prefixes
    nome = nome
      .replace(/\s+(manual|aut|auto|automatico|automático|modelo|versao|versão|flex|turbo|tsi|gti|sedan|hatch|suv)\s*$/gi, '')
      .replace(/^(ra|rg|nr|cp|seq|cod|ref|id|prop|num)\s+/gi, '')
      .replace(/^\d+\s+/, '')
      .replace(/\s+\d+$/, '')
      .trim();
    
    // Validate minimum name requirements
    const words = nome.split(/\s+/).filter((w: string) => w.length >= 2);
    if (words.length < 2 || nome.length < 5) {
      console.log(`🧹 [POST-CLEAN] Nome inválido após limpeza: "${nome}" → null`);
      policy.nome_cliente = null;
    } else {
      policy.nome_cliente = words.map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');
    }
  }
  
  return policy;
}

// 🔴 NOMENCLATURA ELITE v4.1: [Primeiro Nome] - [Ramo] ([Objeto]) - [Placa] - [Cia] - [Tipo]
function generateSmartTitle(policy: any): string {
  // Primeiro nome do cliente (limpa "NÃO IDENTIFICADO")
  const clientName = policy.nome_cliente || 'Cliente';
  const firstName = clientName.split(' ')[0].replace(/NÃO|IDENTIFICADO/gi, '').trim() || 'Cliente';
  
  // Ramo do seguro
  const ramo = policy.ramo_seguro || 'Seguro';
  
  // 🔴 LIMPAR objeto_segurado (remover código numérico no início - formato HDI)
  let objeto = '';
  if (policy.objeto_segurado) {
    // Remove "0002866 - " ou "0002866 ‑ " ou similar do início (código HDI)
    const cleanObj = policy.objeto_segurado
      .replace(/^\d+\s*[\-‑–—]\s*/, '') // Remove código numérico inicial
      .replace(/^VW\s*/i, 'VW ') // Normaliza VW
      .trim();
    objeto = cleanObj.split(' ').slice(0, 3).join(' ').substring(0, 25);
  }
  
  // 🔴 LIMPAR identificacao_adicional (remover UF - formato HDI "CNS0059 - SP")
  let identificacao = '';
  if (policy.identificacao_adicional) {
    // Extrai apenas a placa (7 caracteres antes do " - UF" ou padrão de placa)
    const placaMatch = policy.identificacao_adicional.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
    if (placaMatch) {
      identificacao = placaMatch[1].toUpperCase();
    } else {
      // Fallback: pega a parte antes do traço (que pode ser a UF)
      identificacao = policy.identificacao_adicional.split(/[\-‑–—]/)[0].trim();
    }
  }
  
  // Sigla da seguradora (primeira palavra, uppercase)
  const seguradora = (policy.nome_seguradora || 'CIA').split(' ')[0].toUpperCase();
  
  // Tipo de documento no formato esperado
  const tipo = policy.tipo_documento === 'ENDOSSO' 
    ? 'ENDOSSO' 
    : policy.tipo_operacao === 'RENOVACAO'
      ? 'RENOVACAO'
      : policy.tipo_documento === 'ORCAMENTO' 
        ? 'ORCAMENTO' 
        : 'NOVA';
  
  // Montar título: Luis - Auto (Golf GTI) - ABC1234 - HDI - NOVA
  let titulo = `${firstName} - ${ramo}`;
  if (objeto) titulo += ` (${objeto})`;
  if (identificacao) titulo += ` - ${identificacao}`;
  titulo += ` - ${seguradora} - ${tipo}`;
  
  return titulo.substring(0, 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const totalStartTime = performance.now();
  console.log("🚀 [BULK-OCR v4.0 - ELITE TRIMMER] Iniciando com corte de páginas...");

  try {
    const { files } = await req.json();
    
    if (!files || files.length === 0) {
      throw new Error("Nenhum arquivo recebido.");
    }

    console.log(`📁 [BULK-OCR] Recebidos ${files.length} arquivos`);

    const allTexts: { fileName: string; text: string; source: 'LOCAL' | 'OCR' | 'TRIMMED' }[] = [];
    const ocrErrors: string[] = [];

    for (const [index, file] of files.entries()) {
      const fileStart = performance.now();
      let extractedText = "";
      let textSource: 'LOCAL' | 'OCR' | 'TRIMMED' = 'LOCAL';

      try {
        // Limpeza do base64
        const base64Clean = file.base64.includes(',') 
          ? file.base64.split(',')[1] 
          : file.base64;
        
        const binaryString = atob(base64Clean);
        const binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }

        const fileSizeKB = Math.round(binaryData.length / 1024);
        console.log(`📄 [${index + 1}/${files.length}] ${file.fileName}: ${fileSizeKB}KB`);

        // ========== v4.0 - CORTE DE PÁGINAS COM PDF-LIB ==========
        let miniPdfBytes: Uint8Array;
        let totalPages = 1;
        let pagesToCopy: number[] = [0];
        
        try {
          const pdfDoc = await PDFDocument.load(binaryData, { ignoreEncryption: true });
          totalPages = pdfDoc.getPageCount();
          
          // Pegar só páginas 1-2 (índice 0-1) onde estão os dados importantes
          const subDoc = await PDFDocument.create();
          pagesToCopy = totalPages >= 2 ? [0, 1] : [0];
          const copiedPages = await subDoc.copyPages(pdfDoc, pagesToCopy);
          copiedPages.forEach(p => subDoc.addPage(p));
          
          miniPdfBytes = await subDoc.save();
          textSource = 'TRIMMED';
          console.log(`✂️ [TRIMMED] ${file.fileName}: ${totalPages} páginas → ${pagesToCopy.length} processadas`);
        } catch (trimError) {
          console.warn(`⚠️ [TRIM] Falha ao cortar PDF, usando original:`, trimError);
          miniPdfBytes = binaryData;
        }

        // ========== EXTRAÇÃO DE TEXTO DO MINI PDF ==========
        // Primeiro tenta extração local rápida
        const localText = extractTextFromPdfBuffer(miniPdfBytes);
        const quality = evaluateTextQuality(localText);
        
        console.log(`🔍 [QUALIDADE] ${file.fileName}: score=${quality.score.toFixed(1)}, keywords=${quality.keywordHits}`);
        
        // Se qualidade boa, usa texto local
        if (localText.length > 100 && quality.keywordHits >= 3 && quality.score > 30) {
          extractedText = localText;
          console.log(`✅ [${textSource}] Texto ACEITO! ${extractedText.length} chars em ${Math.round(performance.now() - fileStart)}ms`);
        } else {
          // Fallback: OCR.space no mini PDF
          if (miniPdfBytes.length > MAX_OCR_SIZE) {
            console.log(`⚠️ [OCR] Arquivo ${fileSizeKB}KB > 512KB, usando texto local disponível`);
            if (localText.length > 50) extractedText = localText;
          } else {
            console.log(`🔍 [OCR] Chamando OCR.space para ${file.fileName}...`);
            
            // ✅ Usa função segura de conversão (evita stack overflow)
            let miniBase64: string;
            try {
              miniBase64 = uint8ArrayToBase64(miniPdfBytes);
            } catch (conversionError: any) {
              console.error(`💥 [CONVERSION] Erro ao converter para base64:`, conversionError.message);
              ocrErrors.push(`${file.fileName}: Erro na conversão base64 - ${conversionError.message}`);
              if (localText.length > 50) extractedText = localText;
              continue; // Pula para o próximo arquivo
            }
            
            const formData = new FormData();
            formData.append('apikey', OCR_SPACE_KEY);
            formData.append('language', 'por');
            formData.append('OCREngine', '2');
            formData.append('isTable', 'true');
            formData.append('filetype', 'PDF');
            formData.append('base64Image', `data:application/pdf;base64,${miniBase64}`);

            const ocrRes = await fetch('https://api.ocr.space/parse/image', {
              method: 'POST',
              body: formData,
            });

            const ocrData = await ocrRes.json();
            
            if (!ocrData.IsErroredOnProcessing && ocrData.ParsedResults?.[0]?.ParsedText) {
              extractedText = ocrData.ParsedResults[0].ParsedText;
              textSource = 'OCR';
              console.log(`✅ [OCR] Sucesso! ${extractedText.length} chars em ${Math.round(performance.now() - fileStart)}ms`);
            } else {
              console.error(`❌ [OCR] Falha:`, ocrData.ErrorMessage?.[0] || 'Erro');
              ocrErrors.push(`${file.fileName}: ${ocrData.ErrorMessage?.[0] || 'Falha OCR'}`);
              if (localText.length > 50) extractedText = localText;
            }
          }
        }

        // Adiciona texto filtrado
        if (extractedText && extractedText.trim().length > 10) {
          const filteredText = filterEssentialText(extractedText);
          console.log(`🔎 [FILTRO] ${file.fileName}: ${extractedText.length} → ${filteredText.length} chars`);
          console.log(`📝 [PREVIEW] ${file.fileName}:\n${filteredText.substring(0, 500)}...`);
          allTexts.push({ fileName: file.fileName, text: filteredText, source: textSource });
        }

      } catch (err: any) {
        console.error(`💥 Erro crítico em ${file.fileName}:`, err.message);
        ocrErrors.push(`${file.fileName}: ${err.message}`);
      }
    }

    console.log(`📊 [EXTRAÇÃO] ${allTexts.length}/${files.length} arquivos processados`);

    if (allTexts.length === 0) {
      throw new Error(`Nenhum texto extraído. Erros: ${ocrErrors.join('; ')}`);
    }

    // ========== CHAMADA IA (LOVABLE AI GATEWAY) ==========
    console.log(`🧠 [IA] Analisando ${allTexts.length} documentos...`);
    const aiStartTime = performance.now();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const aggregatedText = allTexts
      .map(t => `\n\n=== DOCUMENTO: ${t.fileName} ===\n${t.text}\n`)
      .join('');

    // v6.1: System Prompt com Chain of Thought, Negative Constraints e sanitização agressiva
    const systemPrompt = `Você é um ANALISTA SÊNIOR de seguros brasileiro.
SIGA O PROCESSO ABAIXO RIGOROSAMENTE (Chain of Thought):

## PASSO 1: IDENTIFICAR TIPO DE DOCUMENTO
Para cada documento separado por "=== DOCUMENTO: ... ===":
- APOLICE: Documento emitido com número final
- PROPOSTA: Antes da emissão (número de proposta)
- ORCAMENTO: Apenas cotação (sem número definitivo)
- ENDOSSO: Alteração em apólice existente

## PASSO 2: LOCALIZAR SEÇÃO "DADOS DO SEGURADO"
Procure por termos: "Segurado", "Titular", "Estipulante", "Proponente"
EXTRAIA:
- Nome COMPLETO (ignorar corretores, seguradoras, modelos de veículo)
- CPF ou CNPJ (apenas dígitos, 11 ou 14 chars)
- Email (se disponível)
- Telefone (se disponível)

## PASSO 3: SANITIZAR NOME DO CLIENTE (CRÍTICO!)
O nome extraído DEVE passar por limpeza:
- REMOVER palavras que são parte de veículos: modelo, versão, flex, aut, manual, turbo, tsi, tfsi, gti, sedan, hatch, suv
- REMOVER prefixos de OCR: RA, RG, CP, NR, NO, SEQ, COD, REF, ID, PROP, NUM
- REMOVER números puros no início ou fim
- REMOVER títulos: Dr, Dra, Sr, Sra
- RESULTADO: Apenas o nome da pessoa/empresa

Exemplos de sanitização:
- "RA TATIANE DELLA BARDA MODELO" → "Tatiane Della Barda"
- "ALEXANDRE PELLAGIO MODELO 350" → "Alexandre Pellagio"
- "123456 MARINA DA SILVA" → "Marina Da Silva"
- "MARIA SILVA FLEX 1.6" → "Maria Silva"

## PASSO 4: EXTRAIR VALORES FINANCEIROS
Procure na ordem de prioridade:
1. "Prêmio Líquido", "Premio Comercial", "Valor Base", "Líquido"
2. Se não achar líquido mas achar total: premio_liquido = premio_total / 1.0738
3. Se achar parcela (ex: "4x R$ 500"): premio_liquido = parcela × qtd × 0.93

SEMPRE retorne números SEM "R$", usando PONTO como decimal.

## PASSO 5: IDENTIFICAR RAMO DO SEGURO
Palavras-chave por ramo:
- AUTOMÓVEL: placa, veículo, marca, modelo, chassi, rcf, condutor, colisão, roubo
- RESIDENCIAL: casa, apartamento, imóvel, residência, incêndio residencial
- VIDA: morte, invalidez, funeral, ap, acidentes pessoais, prestamista
- EMPRESARIAL: empresa, comercial, cnpj, lucros cessantes, estabelecimento
- SAÚDE: médico, hospitalar, plano, odonto, ANS

## PASSO 6: EXTRAIR OBJETO SEGURADO
Para AUTO:
- objeto_segurado = MARCA + MODELO (ex: "VW Golf GTI 2.0 TSI")
- identificacao_adicional = PLACA (7 chars, sem UF)
- HDI formato: "0002866 ‑ Volkswagen Polo" → usar "Volkswagen Polo"
- HDI formato: "CNS0059 - SP" → extrair "CNS0059"

Para RESIDENCIAL:
- objeto_segurado = "Imóvel Residencial"
- identificacao_adicional = CEP

## ⚠️ NEGATIVE CONSTRAINTS (PROIBIÇÕES ABSOLUTAS) ⚠️
NÃO EXTRAIA como dados os seguintes termos de instrução do documento:
- "MANUAL", "MAN UAL", "AUT", "AUTOMÁTICO" → São tipos de câmbio, NÃO são números de apólice
- "MODELO", "VERSAO", "VERSÃO" → São labels, NÃO são nomes de cliente
- "SEGURADO", "TITULAR", "ESTIPULANTE" → São headers, NÃO são nomes
- "RAMO", "PROPOSTA", "APOLICE" → São labels, NÃO são valores
- Qualquer string < 4 caracteres (ex: "RA", "NR", "SP") → Provavelmente lixo de OCR
- Qualquer string que contenha espaço no meio de palavra (ex: "man ual") → Lixo de OCR

Se encontrar esses termos onde deveria haver um dado, retorne NULL para o campo.

## REGRAS DE OURO (NÃO VIOLAR!)
1. CPF/CNPJ: APENAS dígitos (11 ou 14). Nunca null se visível!
2. Datas: formato YYYY-MM-DD
3. Valores: números puros (ex: 1234.56)
4. Nome: SANITIZADO, sem lixo de OCR, sem partes de veículo
5. arquivo_origem = nome EXATO do arquivo fonte
6. NUNCA inclua nomes de corretoras ou seguradoras no campo nome_cliente
7. numero_apolice deve ser um código numérico/alfanumérico, NUNCA "manual" ou similar
8. objeto_segurado deve ser um veículo/imóvel real, NUNCA termos de instrução`;

    const toolSchema = {
      type: "function",
      function: {
        name: "extract_policies",
        description: "Extrai dados estruturados de documentos de seguro",
        parameters: {
          type: "object",
          properties: {
            policies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  arquivo_origem: { type: "string" },
                  tipo_documento: { type: "string", enum: ["APOLICE", "PROPOSTA", "ORCAMENTO", "ENDOSSO"] },
                  nome_cliente: { type: "string" },
                  cpf_cnpj: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  telefone: { type: ["string", "null"] },
                  endereco_completo: { type: ["string", "null"] },
                  numero_apolice: { type: ["string", "null"] },
                  numero_proposta: { type: ["string", "null"] },
                  nome_seguradora: { type: "string" },
                  ramo_seguro: { type: "string" },
                  objeto_segurado: { type: ["string", "null"] },
                  identificacao_adicional: { type: ["string", "null"] },
                  data_inicio: { type: ["string", "null"] },
                  data_fim: { type: ["string", "null"] },
                  premio_liquido: { type: ["number", "null"] },
                  premio_total: { type: ["number", "null"] },
                  iof: { type: ["number", "null"] },
                  parcelas: { type: ["number", "null"] },
                },
                required: ["arquivo_origem", "tipo_documento", "nome_cliente", "nome_seguradora", "ramo_seguro"]
              }
            }
          },
          required: ["policies"]
        }
      }
    };

    // v6.0: Usando Gemini 3 Flash Preview para melhor raciocínio
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',  // v6.0: Upgraded from gemini-2.5-flash
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise os seguintes documentos de seguro:\n${aggregatedText}` }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "extract_policies" } }
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('❌ [IA] Erro:', aiRes.status, errText);
      throw new Error(`Erro na IA: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const aiDuration = ((performance.now() - aiStartTime) / 1000).toFixed(2);
    console.log(`🧠 [IA] Resposta recebida em ${aiDuration}s`);

    // Extrair resultado do tool call
    let extractedPolicies: any[] = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        extractedPolicies = parsed.policies || [];
      } catch (e) {
        console.error('❌ Erro ao parsear resposta da IA:', e);
      }
    }

    // Fallback: tentar extrair do content se não veio como tool call
    if (extractedPolicies.length === 0 && aiData.choices?.[0]?.message?.content) {
      try {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          extractedPolicies = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('❌ Fallback parse também falhou:', e);
      }
    }

    console.log(`📊 [IA] ${extractedPolicies.length} apólices extraídas`);

    // v6.1: POST-PROCESSING CLEAN + gerar títulos
    console.log('🧹 [POST-CLEAN v6.1] Iniciando limpeza de garbage em lote...');
    const processedPolicies = extractedPolicies.map((policy: any) => {
      // Aplicar limpeza de garbage
      const cleanedPolicy = postProcessExtractedPolicy({ ...policy });
      
      return {
        ...cleanedPolicy,
        titulo_sugerido: generateSmartTitle(cleanedPolicy),
        premio_liquido: typeof cleanedPolicy.premio_liquido === 'number' ? cleanedPolicy.premio_liquido : null,
        // Fallback para nome se ficou null após limpeza
        nome_cliente: cleanedPolicy.nome_cliente || 'Não Identificado',
      };
    });

    const totalDuration = ((performance.now() - totalStartTime) / 1000).toFixed(2);
    console.log(`✅ [BULK-OCR v6.1] Concluído em ${totalDuration}s`);

    return new Response(JSON.stringify({
      success: true,
      data: processedPolicies,
      processed_files: allTexts.map(t => t.fileName),
      errors: ocrErrors,
      stats: {
        total_files: files.length,
        processed: allTexts.length,
        trimmed: allTexts.filter(t => t.source === 'TRIMMED').length,
        ocr: allTexts.filter(t => t.source === 'OCR').length,
        local: allTexts.filter(t => t.source === 'LOCAL').length,
        extraction_time: `${((performance.now() - totalStartTime - (performance.now() - aiStartTime)) / 1000).toFixed(2)}s`,
        ai_time: `${aiDuration}s`,
        total_time: `${totalDuration}s`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('💥 [BULK-OCR] Erro fatal:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      data: [],
      processed_files: [],
      errors: [error.message]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
