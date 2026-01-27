import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// OCR-ONLY MODE - ZERO IA DEPENDENCY
// Extração de texto puro via OCR.space Engine 2
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
 * Corta PDF para 2 páginas (máx 512KB para OCR.space gratuito)
 */
async function trimPdfTo2Pages(base64: string): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    if (pageCount <= 2) {
      console.log(`📄 PDF tem ${pageCount} páginas, mantendo todas`);
      return base64;
    }
    
    // Remove páginas excedentes (mantém apenas 1-2)
    const pagesToRemove = pageCount - 2;
    for (let i = 0; i < pagesToRemove; i++) {
      pdfDoc.removePage(2); // Sempre remove a página 3 (índice 2)
    }
    
    const trimmedBytes = await pdfDoc.save();
    console.log(`✂️ PDF cortado: ${pageCount} → 2 páginas`);
    return uint8ArrayToBase64(new Uint8Array(trimmedBytes));
  } catch (error) {
    console.error('Erro ao cortar PDF:', error);
    return base64;
  }
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
    const mode = body.mode || 'ocr-only'; // Novo: modo padrão é OCR puro

    if (!fileBase64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'base64 or fileBase64 is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Processando: ${fileName}, mimeType: ${mimeType}, mode: ${mode}`);
    
    // Para PDFs, cortar para 2 páginas (limite OCR.space gratuito)
    let processedBase64 = fileBase64;
    if (mimeType === 'application/pdf') {
      processedBase64 = await trimPdfTo2Pages(fileBase64);
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
            error: 'Falha na extração de texto (local e OCR)' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    console.log(`✅ Extração concluída via ${source}: ${rawText.length} caracteres`);

    return new Response(JSON.stringify({ 
      success: true, 
      rawText: rawText,
      source: source,
      fileName: fileName,
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
