import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// OCR-ONLY MODE v3.0 - PROGRESSIVE SCAN SUPPORT
// Extração de texto puro via OCR.space Engine 2
// Agora com suporte a extração por range de páginas
// ============================================================

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

// ============================================================
// UTILITÁRIOS
// ============================================================

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, [...chunk]);
  }
  return btoa(binary);
}

/**
 * Extrai um range específico de páginas do PDF (v3.0)
 * @param base64 PDF em base64
 * @param startPage Página inicial (1-indexed)
 * @param endPage Página final (1-indexed, inclusive)
 * @returns { sliceBase64, totalPages, actualStart, actualEnd }
 */
async function extractPageRange(
  base64: string, 
  startPage: number, 
  endPage: number
): Promise<{ sliceBase64: string; totalPages: number; actualStart: number; actualEnd: number }> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    // Ajusta range para não exceder total
    const actualStart = Math.max(1, startPage);
    const actualEnd = Math.min(endPage, totalPages);
    
    console.log(`📄 PDF tem ${totalPages} páginas, extraindo ${actualStart}-${actualEnd}`);
    
    if (actualStart > totalPages) {
      // Páginas solicitadas não existem
      return { 
        sliceBase64: '', 
        totalPages, 
        actualStart, 
        actualEnd: actualStart - 1 
      };
    }
    
    // Cria novo PDF apenas com as páginas solicitadas
    const newDoc = await PDFDocument.create();
    for (let i = actualStart - 1; i < actualEnd; i++) {
      const [page] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(page);
    }
    
    const newBytes = await newDoc.save();
    const sliceBase64 = uint8ArrayToBase64(new Uint8Array(newBytes));
    
    console.log(`✂️ Slice criado: páginas ${actualStart}-${actualEnd} de ${totalPages}`);
    
    return { sliceBase64, totalPages, actualStart, actualEnd };
    
  } catch (error) {
    console.error('Erro ao extrair range de páginas:', error);
    // Fallback: retorna o PDF original
    return { sliceBase64: base64, totalPages: 1, actualStart: 1, actualEnd: 1 };
  }
}

/**
 * Corta PDF para máximo de páginas (limite OCR.space gratuito)
 * @deprecated Use extractPageRange para controle preciso
 */
async function trimPdfToMaxPages(base64: string, maxPages: number = 2): Promise<string> {
  const result = await extractPageRange(base64, 1, maxPages);
  return result.sliceBase64;
}

/**
 * Extrai texto de streams do PDF (sem OCR)
 * Funciona para PDFs com texto selecionável
 */
function extractTextFromPdfBuffer(base64: string): string {
  try {
    const decoded = atob(base64);
    
    // Regex para capturar streams de texto em PDFs
    const textMatches: string[] = [];
    
    // Busca por objetos de texto (BT...ET blocks)
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    while ((match = btEtRegex.exec(decoded)) !== null) {
      // Extrai strings entre parênteses ou <hex>
      const textBlock = match[1];
      const stringRegex = /\((.*?)\)|<([0-9A-Fa-f]+)>/g;
      let strMatch;
      while ((strMatch = stringRegex.exec(textBlock)) !== null) {
        if (strMatch[1]) {
          textMatches.push(strMatch[1]);
        } else if (strMatch[2]) {
          // Hex string - tenta decodificar
          try {
            const hex = strMatch[2];
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
              str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            textMatches.push(str);
          } catch { /* ignore */ }
        }
      }
    }
    
    // Também busca por Tj/TJ operators
    const tjRegex = /\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj/g;
    while ((match = tjRegex.exec(decoded)) !== null) {
      const content = match[1] || match[2];
      if (content) {
        // Limpa operadores e extrai texto
        const cleaned = content.replace(/\(\d+\)/g, ' ').replace(/[\[\]]/g, '');
        const innerStrings = cleaned.match(/\((.*?)\)/g);
        if (innerStrings) {
          innerStrings.forEach(s => textMatches.push(s.replace(/[()]/g, '')));
        } else {
          textMatches.push(cleaned);
        }
      }
    }
    
    const extractedText = textMatches.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`📝 Extração local: ${extractedText.length} caracteres`);
    return extractedText;
    
  } catch (error) {
    console.error('Erro na extração local:', error);
    return '';
  }
}

/**
 * Avalia a qualidade do texto extraído
 * Score 0-100: 0 = ruim, 100 = excelente
 */
function evaluateTextQuality(text: string): { score: number; reason: string } {
  if (!text || text.length < 50) {
    return { score: 0, reason: 'Texto muito curto' };
  }
  
  let score = 0;
  
  // Tamanho mínimo
  if (text.length >= 200) score += 20;
  if (text.length >= 500) score += 10;
  if (text.length >= 1000) score += 10;
  
  // Contém palavras-chave de seguros
  const keywords = ['segurado', 'apólice', 'apolice', 'prêmio', 'premio', 'vigência', 'vigencia', 'cpf', 'cnpj', 'seguradora'];
  const keywordCount = keywords.filter(kw => text.toLowerCase().includes(kw)).length;
  score += keywordCount * 5;
  
  // Contém datas
  if (/\d{2}[\/-]\d{2}[\/-]\d{4}/.test(text)) score += 10;
  
  // Contém valores monetários
  if (/R\$\s*[\d.,]+/.test(text) || /\d{1,3}(?:\.\d{3})*,\d{2}/.test(text)) score += 10;
  
  // Contém CPF ou CNPJ
  if (/\d{3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?\d{2}/.test(text)) score += 15;
  if (/\d{2}[.\s]?\d{3}[.\s]?\d{3}[\s\/]?\d{4}[\-\s]?\d{2}/.test(text)) score += 15;
  
  // Contém placa de veículo
  if (/[A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2}/i.test(text)) score += 10;
  
  // Penaliza caracteres estranhos (PDF corrompido)
  const strangeChars = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  score -= strangeChars * 2;
  
  return { 
    score: Math.max(0, Math.min(100, score)), 
    reason: score >= 30 ? 'Qualidade aceitável' : 'Qualidade baixa - necessita OCR' 
  };
}

/**
 * Chama OCR.space API para extração de texto
 */
async function callOcrSpace(base64: string, mimeType: string): Promise<string> {
  const OCR_SPACE_API_KEY = Deno.env.get('OCR_SPACE_API_KEY') || 'K88888888888888';
  
  const formData = new FormData();
  formData.append('base64Image', `data:${mimeType};base64,${base64}`);
  formData.append('language', 'por'); // Português
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Engine 2 = melhor para tabelas
  formData.append('isTable', 'true');
  formData.append('scale', 'true');
  
  console.log('🔍 Chamando OCR.space Engine 2...');
  
  const response = await fetch(OCR_SPACE_API_URL, {
    method: 'POST',
    headers: {
      'apikey': OCR_SPACE_API_KEY,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OCR.space error:', response.status, errorText);
    throw new Error(`OCR.space API error: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.IsErroredOnProcessing) {
    console.error('OCR.space processing error:', result.ErrorMessage);
    throw new Error(result.ErrorMessage || 'OCR processing failed');
  }
  
  const extractedText = result.ParsedResults
    ?.map((r: any) => r.ParsedText)
    .join('\n') || '';
  
  console.log(`✅ OCR.space: ${extractedText.length} caracteres extraídos`);
  return extractedText;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Suporta ambos os formatos: legado (fileBase64) e novo (base64)
    const fileBase64 = body.base64 || body.fileBase64;
    const mimeType = body.mimeType || 'application/pdf';
    const fileName = body.fileName || 'document.pdf';
    const mode = body.mode || 'ocr-only';
    
    // NOVO: Parâmetros de paginação para Progressive Scan
    const startPage = body.startPage || 1;
    const endPage = body.endPage || 2;

    if (!fileBase64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'base64 or fileBase64 is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Processando: ${fileName}, mimeType: ${mimeType}, mode: ${mode}, páginas: ${startPage}-${endPage}`);
    
    // Para PDFs, extrai o range de páginas solicitado
    let processedBase64 = fileBase64;
    let pageInfo = { totalPages: 1, actualStart: 1, actualEnd: 1 };
    
    if (mimeType === 'application/pdf') {
      const result = await extractPageRange(fileBase64, startPage, endPage);
      processedBase64 = result.sliceBase64;
      pageInfo = {
        totalPages: result.totalPages,
        actualStart: result.actualStart,
        actualEnd: result.actualEnd,
      };
      
      // Se o slice está vazio (páginas não existem), retorna vazio
      if (!processedBase64) {
        return new Response(JSON.stringify({ 
          success: true, 
          rawText: '',
          source: 'EMPTY',
          fileName,
          pageRange: pageInfo,
          hasMorePages: false,
          stats: { characters: 0, qualityScore: 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 1. Tenta extração local primeiro (sem API externa)
    let rawText = extractTextFromPdfBuffer(processedBase64);
    let source = 'LOCAL';
    
    const quality = evaluateTextQuality(rawText);
    console.log(`📊 Qualidade extração local: ${quality.score}/100 - ${quality.reason}`);
    
    // 2. Se qualidade baixa, usa OCR.space
    if (quality.score < 30) {
      try {
        rawText = await callOcrSpace(processedBase64, mimeType);
        source = 'OCR';
      } catch (ocrError) {
        console.error('❌ OCR.space falhou:', ocrError);
        // Usa o que temos da extração local
        if (!rawText || rawText.length < 50) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Falha na extração de texto (local e OCR)',
            pageRange: pageInfo,
            hasMorePages: pageInfo.actualEnd < pageInfo.totalPages,
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    console.log(`✅ Extração concluída via ${source}: ${rawText.length} caracteres (páginas ${pageInfo.actualStart}-${pageInfo.actualEnd} de ${pageInfo.totalPages})`);

    return new Response(JSON.stringify({ 
      success: true, 
      rawText: rawText,
      source: source,
      fileName: fileName,
      pageRange: {
        start: pageInfo.actualStart,
        end: pageInfo.actualEnd,
        total: pageInfo.totalPages,
      },
      hasMorePages: pageInfo.actualEnd < pageInfo.totalPages,
      stats: {
        characters: rawText.length,
        qualityScore: quality.score,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-policy function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
