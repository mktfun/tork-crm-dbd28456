import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// PURE OCR PROXY v6.0 - "CLIENT-SIDE SLICER"
// 
// Fluxo: Frontend fatia PDF → Base64 → OCR.space → Limpeza → rawText
// Zero IA. Zero fatiamento no servidor. Apenas OCR visual puro.
// ============================================================

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

// ============================================================
// UTILITÁRIOS
// ============================================================

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

    if (!fileBase64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'base64 or fileBase64 is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 [v6.0] Processando: ${fileName} (${(fileBase64.length / 1024).toFixed(0)}KB)`);
    
    // 🔥 CLIENT-SIDE SLICER: PDF já vem fatiado do frontend!
    // Não precisa mais de extractPageRange() - apenas chama OCR diretamente
    
    let rawText = '';
    try {
      rawText = await callOcrSpace(fileBase64, mimeType);
    } catch (ocrError) {
      console.error('❌ OCR.space falhou:', ocrError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Falha na extração OCR visual',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 🧹 THE CLEANER: Remove lixo binário
    const cleanText = cleanOcrText(rawText);
    
    console.log(`✅ Extração OCR: ${rawText.length} → ${cleanText.length} chars (limpo)`);

    return new Response(JSON.stringify({ 
      success: true, 
      rawText: cleanText,
      source: 'OCR',
      fileName: fileName,
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
