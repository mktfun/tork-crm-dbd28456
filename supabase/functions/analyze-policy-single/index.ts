import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OCR_SPACE_KEY = 'K82045193188957';
const MAX_OCR_SIZE = 512 * 1024;

// ✅ Safe byte-to-base64 conversion (avoids stack overflow)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Keywords for text quality validation
const KEYWORDS = [
  'NOME', 'CPF', 'CNPJ', 'SEGURADO', 'TITULAR', 'ESTIPULANTE',
  'APOLICE', 'PROPOSTA', 'ORCAMENTO', 'ENDOSSO', 'RENOVACAO',
  'VIGENCIA', 'INICIO', 'TERMINO', 'FIM', 'VALIDADE',
  'PREMIO', 'LIQUIDO', 'TOTAL', 'IOF', 'VALOR', 'PARCELA',
  'RAMO', 'SEGURADORA', 'COBERTURA', 'FRANQUIA',
  'PLACA', 'MARCA', 'MODELO', 'VEICULO', 'CHASSI',
  'RESIDENCIAL', 'IMOVEL', 'VIDA', 'EMPRESA'
];

function evaluateTextQuality(text: string): { score: number; keywordHits: number } {
  const upperText = text.toUpperCase();
  const keywordHits = KEYWORDS.filter(kw => upperText.includes(kw)).length;
  const digitMatches = text.match(/\d/g) || [];
  const monetaryMatches = text.match(/R\$\s*[\d.,]+|\d{1,3}[.]\d{3}[,]\d{2}/g) || [];
  const digitRatio = (digitMatches.length + monetaryMatches.length * 10) / Math.max(text.length, 1);
  const score = (keywordHits * 5) + (digitRatio * 100);
  return { score, keywordHits };
}

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

function generateSmartTitle(policy: any): string {
  const clientName = policy.nome_cliente || 'Cliente';
  const firstName = clientName.split(' ')[0].replace(/NÃO|IDENTIFICADO/gi, '').trim() || 'Cliente';
  const ramo = policy.ramo_seguro || 'Seguro';
  
  let objeto = '';
  if (policy.objeto_segurado) {
    const cleanObj = policy.objeto_segurado
      .replace(/^\d+\s*[\-‑–—]\s*/, '')
      .replace(/^VW\s*/i, 'VW ')
      .trim();
    objeto = cleanObj.split(' ').slice(0, 3).join(' ').substring(0, 25);
  }
  
  let identificacao = '';
  if (policy.identificacao_adicional) {
    const placaMatch = policy.identificacao_adicional.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
    if (placaMatch) {
      identificacao = placaMatch[1].toUpperCase();
    } else {
      identificacao = policy.identificacao_adicional.split(/[\-‑–—]/)[0].trim();
    }
  }
  
  const seguradora = (policy.nome_seguradora || 'CIA').split(' ')[0].toUpperCase();
  
  const tipo = policy.tipo_documento === 'ENDOSSO' 
    ? 'ENDOSSO' 
    : policy.tipo_operacao === 'RENOVACAO'
      ? 'RENOVACAO'
      : policy.tipo_documento === 'ORCAMENTO' 
        ? 'ORCAMENTO' 
        : 'NOVA';
  
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

  const startTime = performance.now();
  console.log("🚀 [SINGLE-OCR v1.0] Processamento individual iniciado...");

  try {
    const { base64, fileName, mimeType } = await req.json();
    
    if (!base64 || !fileName) {
      throw new Error("Parâmetros obrigatórios: base64, fileName");
    }

    console.log(`📄 [SINGLE] Processando: ${fileName}`);

    // Decode base64 to binary
    const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryString = atob(base64Clean);
    const binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }

    const fileSizeKB = Math.round(binaryData.length / 1024);
    console.log(`📊 [SINGLE] Tamanho: ${fileSizeKB}KB`);

    // ========== PDF TRIMMING (pages 1-2 only) ==========
    let miniPdfBytes: Uint8Array;
    let totalPages = 1;
    let textSource: 'LOCAL' | 'OCR' | 'TRIMMED' = 'LOCAL';
    
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      try {
        const pdfDoc = await PDFDocument.load(binaryData, { ignoreEncryption: true });
        totalPages = pdfDoc.getPageCount();
        
        const subDoc = await PDFDocument.create();
        const pagesToCopy = totalPages >= 2 ? [0, 1] : [0];
        const copiedPages = await subDoc.copyPages(pdfDoc, pagesToCopy);
        copiedPages.forEach(p => subDoc.addPage(p));
        
        miniPdfBytes = await subDoc.save();
        textSource = 'TRIMMED';
        console.log(`✂️ [TRIM] ${totalPages} páginas → ${pagesToCopy.length} processadas`);
      } catch (trimError) {
        console.warn(`⚠️ [TRIM] Falha ao cortar PDF:`, trimError);
        miniPdfBytes = binaryData;
      }
    } else {
      // For images, use original data
      miniPdfBytes = binaryData;
    }

    // ========== TEXT EXTRACTION ==========
    let extractedText = "";
    
    // Try local extraction first (for PDFs)
    if (isPdf) {
      const localText = extractTextFromPdfBuffer(miniPdfBytes);
      const quality = evaluateTextQuality(localText);
      
      console.log(`🔍 [QUALITY] score=${quality.score.toFixed(1)}, keywords=${quality.keywordHits}`);
      
      if (localText.length > 100 && quality.keywordHits >= 3 && quality.score > 30) {
        extractedText = localText;
        console.log(`✅ [LOCAL] Texto aceito: ${extractedText.length} chars`);
      }
    }
    
    // Fallback: OCR.space
    if (!extractedText || extractedText.length < 100) {
      if (miniPdfBytes.length > MAX_OCR_SIZE) {
        console.log(`⚠️ [OCR] Arquivo muito grande (${fileSizeKB}KB > 512KB)`);
      } else {
        console.log(`🔍 [OCR] Chamando OCR.space...`);
        
        const miniBase64 = uint8ArrayToBase64(miniPdfBytes);
        
        const formData = new FormData();
        formData.append('apikey', OCR_SPACE_KEY);
        formData.append('language', 'por');
        formData.append('OCREngine', '2');
        formData.append('isTable', 'true');
        formData.append('filetype', isPdf ? 'PDF' : 'Auto');
        formData.append('base64Image', `data:${mimeType || 'application/pdf'};base64,${miniBase64}`);

        const ocrRes = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
        });

        const ocrData = await ocrRes.json();
        
        if (!ocrData.IsErroredOnProcessing && ocrData.ParsedResults?.[0]?.ParsedText) {
          extractedText = ocrData.ParsedResults[0].ParsedText;
          textSource = 'OCR';
          console.log(`✅ [OCR] Sucesso: ${extractedText.length} chars`);
        } else {
          console.error(`❌ [OCR] Falha:`, ocrData.ErrorMessage?.[0] || 'Erro');
        }
      }
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error("Não foi possível extrair texto do documento");
    }

    const filteredText = filterEssentialText(extractedText);
    console.log(`📝 [FILTRO] ${extractedText.length} → ${filteredText.length} chars`);

    // ========== AI EXTRACTION (Lovable Gateway) ==========
    console.log(`🧠 [IA] Analisando documento...`);
    const aiStartTime = performance.now();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um ANALISTA SÊNIOR de seguros brasileiro.
Analise o documento e extraia os dados com MÁXIMA PRECISÃO.

## REGRAS DE OURO (CRÍTICO!)
1. Retorne SEMPRE um objeto JSON válido (não um array)
2. CPF/CNPJ: EXTRAIA SEMPRE da seção "Dados do Segurado". APENAS NÚMEROS (11 ou 14 dígitos)
3. Datas: formato YYYY-MM-DD
4. VALORES: número puro SEM "R$", use PONTO como decimal (ex: 1234.56)
5. Se não encontrar um campo, use null
6. NOME: Capture o nome COMPLETO do segurado. IGNORE nomes de corretores ou seguradoras!

## EXTRAÇÃO DE CPF/CNPJ (PRIORIDADE ABSOLUTA!)
- SEMPRE busque na seção "Dados do Segurado", "Segurado", "Estipulante", "Proponente"
- Remova pontos, traços e barras: 123.456.789-00 → 12345678900
- NUNCA deixe cpf_cnpj como null se houver qualquer documento visível!

## EXTRAÇÃO DO PRÊMIO LÍQUIDO
- Procure "Prêmio Líquido", "Premio Comercial", "Valor Base", "Líquido"
- NÃO confunda com "Prêmio Total" (inclui IOF!)

## EXTRAÇÃO DE RAMO (PRIORIDADE ABSOLUTA!)
- Se ler QUALQUER menção a: Veículo, Placa, Marca, Modelo, RCF, Auto, Automóvel, Carro → ramo_seguro = "AUTOMÓVEL"
- Se ler: Residencial, Residência, Casa, Apartamento, Imóvel → ramo_seguro = "RESIDENCIAL"
- Se ler: Vida, Morte, Invalidez, AP, Acidentes Pessoais → ramo_seguro = "VIDA"
- Se ler: Empresarial, Empresa, Comercial → ramo_seguro = "EMPRESARIAL"
- Se ler: Saúde, Médico, Hospitalar, Plano → ramo_seguro = "SAÚDE"

## VEÍCULOS E PLACAS
- PLACA: formato ABC-1234 ou ABC1D23 (Mercosul)
- objeto_segurado = MARCA + MODELO
- identificacao_adicional = APENAS A PLACA (7 chars)`;

    const toolSchema = {
      type: "function",
      function: {
        name: "extract_policy",
        description: "Extrai dados estruturados de um documento de seguro",
        parameters: {
          type: "object",
          properties: {
            arquivo_origem: { type: "string" },
            tipo_documento: { type: "string", enum: ["APOLICE", "PROPOSTA", "ORCAMENTO", "ENDOSSO"] },
            tipo_operacao: { type: ["string", "null"], enum: ["NOVA", "RENOVACAO", null] },
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
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este documento (${fileName}):\n\n${filteredText}` }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "extract_policy" } }
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('❌ [IA] Erro:', aiRes.status, errText);
      throw new Error(`Erro na IA: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const aiDuration = ((performance.now() - aiStartTime) / 1000).toFixed(2);
    console.log(`🧠 [IA] Resposta em ${aiDuration}s`);

    // Extract result from tool call
    let extractedPolicy: any = null;
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedPolicy = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('❌ Erro ao parsear resposta da IA:', e);
      }
    }

    // Fallback: try to extract from content
    if (!extractedPolicy && aiData.choices?.[0]?.message?.content) {
      try {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedPolicy = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('❌ Fallback parse falhou:', e);
      }
    }

    if (!extractedPolicy) {
      throw new Error("Não foi possível extrair dados do documento");
    }

    // Ensure arquivo_origem is set correctly
    extractedPolicy.arquivo_origem = fileName;

    // Generate smart title
    extractedPolicy.titulo_sugerido = generateSmartTitle(extractedPolicy);

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [SINGLE-OCR] Concluído em ${totalDuration}s`);

    return new Response(JSON.stringify({
      success: true,
      data: extractedPolicy,
      fileName: fileName,
      stats: {
        text_source: textSource,
        total_pages: totalPages,
        text_length: filteredText.length,
        ai_time: `${aiDuration}s`,
        total_time: `${totalDuration}s`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('💥 [SINGLE-OCR] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      data: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
