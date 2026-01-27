import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// PURE OCR PROXY v5.0 - "THE CLEANER"
// 
// Fluxo: Base64 → Trim páginas → OCR.space → Limpeza → rawText
// Zero IA. Zero extração local. Apenas OCR visual puro.
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
 * Extrai um range específico de páginas do PDF
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
    
    const actualStart = Math.max(1, startPage);
    const actualEnd = Math.min(endPage, totalPages);
    
    console.log(`📄 PDF tem ${totalPages} páginas, extraindo ${actualStart}-${actualEnd}`);
    
    if (actualStart > totalPages) {
      return { 
        sliceBase64: '', 
        totalPages, 
        actualStart, 
        actualEnd: actualStart - 1 
      };
    }
    
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
    return { sliceBase64: base64, totalPages: 1, actualStart: 1, actualEnd: 1 };
  }
}

/**
 * THE CLEANER: Remove todos os caracteres não-imprimíveis
 * Mantém apenas ASCII printable + acentos brasileiros + quebras de linha
 */
function cleanOcrText(rawText: string): string {
  if (!rawText) return '';
  
  // Remove caracteres binários/lixo, mantém:
  // \x20-\x7E = ASCII printable (espaço até ~)
  // \u00C0-\u00FF = Latin Extended (acentos)
  // \n\r\t = Whitespace útil
  let cleaned = rawText.replace(/[^\x20-\x7E\u00C0-\u00FF\n\r\t]/g, ' ');
  
  // Normaliza múltiplos espaços
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Chama OCR.space API - Engine 2 (visual, tabelas)
 */
async function callOcrSpace(base64: string, mimeType: string): Promise<string> {
  const OCR_SPACE_API_KEY = Deno.env.get('OCR_SPACE_API_KEY') || 'K88888888888888';
  
  const formData = new FormData();
  formData.append('base64Image', `data:${mimeType};base64,${base64}`);
  formData.append('language', 'por');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');           // Engine 2 = melhor para tabelas
  formData.append('isTable', 'true');          // Modo tabela
  formData.append('scale', 'true');            // Escala automática
  formData.append('detectOrientation', 'true'); // Corrige rotação
  
  console.log('🔍 Chamando OCR.space Engine 2 (modo visual puro)...');
  
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
    ?.map((r: { ParsedText: string }) => r.ParsedText)
    .join('\n') || '';
  
  console.log(`✅ OCR.space: ${extractedText.length} caracteres extraídos`);
  return extractedText;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Suporta ambos os formatos: legado (fileBase64) e novo (base64)
    const fileBase64 = body.base64 || body.fileBase64;
    const mimeType = body.mimeType || 'application/pdf';
    const fileName = body.fileName || 'document.pdf';
    
    // Parâmetros de paginação
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

    console.log(`📄 Processando: ${fileName}, páginas: ${startPage}-${endPage}`);
    
    // Para PDFs, extrai o range de páginas
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
      
      if (!processedBase64) {
        return new Response(JSON.stringify({ 
          success: true, 
          rawText: '',
          source: 'EMPTY',
          fileName,
          pageRange: pageInfo,
          hasMorePages: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 🔥 SEMPRE usa OCR.space (morte total ao extrator local)
    let rawText = '';
    try {
      rawText = await callOcrSpace(processedBase64, mimeType);
    } catch (ocrError) {
      console.error('❌ OCR.space falhou:', ocrError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Falha na extração OCR visual',
        pageRange: pageInfo,
        hasMorePages: pageInfo.actualEnd < pageInfo.totalPages,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 🧹 THE CLEANER: Remove lixo binário
    const cleanText = cleanOcrText(rawText);
    
    console.log(`✅ Extração OCR: ${rawText.length} → ${cleanText.length} chars (limpo)`);
    console.log(`📄 Páginas ${pageInfo.actualStart}-${pageInfo.actualEnd} de ${pageInfo.totalPages}`);

    return new Response(JSON.stringify({ 
      success: true, 
      rawText: cleanText,
      source: 'OCR',
      fileName: fileName,
      pageRange: {
        start: pageInfo.actualStart,
        end: pageInfo.actualEnd,
        total: pageInfo.totalPages,
      },
      hasMorePages: pageInfo.actualEnd < pageInfo.totalPages,
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
