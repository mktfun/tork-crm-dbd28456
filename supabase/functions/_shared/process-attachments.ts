import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function processAttachments(
  supabase: SupabaseClient, 
  attachments: any[], 
  userId: string,
  SUPABASE_URL: string
) {
  const result = { transcriptions: [] as string[], extractedTexts: [] as string[], attachmentUrls: [] as string[] }
  if (!attachments || attachments.length === 0) return result

  for (const att of attachments) {
    if (!att.data_url) continue
    result.attachmentUrls.push(att.data_url)

    const isAudio = att.file_type?.startsWith('audio/') || att.data_url.match(/\.(ogg|mp3|wav|m4a)$/i)
    const isImage = att.file_type?.startsWith('image/') || att.data_url.match(/\.(jpg|jpeg|png|webp)$/i)
    const isPdf = att.file_type === 'application/pdf' || att.data_url.match(/\.pdf$/i)

    if (isAudio) {
      try {
        const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: { audioUrl: att.data_url } })
        if (!error && data?.text) result.transcriptions.push(data.text)
      } catch (err) { console.error('⚠️ Audio transcription failed:', err) }
    } else if (isImage || isPdf) {
      let extractedText = null;

      // ─── Para PDFs/imagens vindas do Chatwoot, fazer upload temporário no Supabase Storage
      let supabaseFileUrl = att.data_url;
      let tempPath: string | null = null;
      try {
        console.log(`📌 Baixando arquivo do Chatwoot para reupload: ${att.data_url}`);
        const fileResp = await fetch(att.data_url);
        if (fileResp.ok) {
          const fileBlob = await fileResp.blob();
          const ext = isPdf ? 'pdf' : (att.data_url.split('.').pop()?.split('?')[0] || 'jpg');
          tempPath = `temp-batch/${userId}/${Date.now()}.${ext}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('quote-uploads')
            .upload(tempPath, fileBlob, { contentType: att.file_type || 'application/pdf', upsert: true });
            
          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage.from('quote-uploads').getPublicUrl(tempPath);
            supabaseFileUrl = publicUrlData.publicUrl;
            console.log(`✅ Arquivo reupado para Storage: ${supabaseFileUrl}`);
          } else {
            console.warn('⚠️ Falha no reupload, usando URL original do Chatwoot (OCR estruturado pode falhar):', uploadErr.message);
          }
        }
      } catch (err) {
        console.warn('⚠️ Erro no reupload do arquivo:', err);
      }

      try {
        console.log(`📄 Tentando OCR Estruturado na apólice (extract-quote-data)...`);
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract-quote-data`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: supabaseFileUrl, userId })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.success && data?.data) {
            console.log(`✅ OCR Estruturado concluído!`);
            // Limpar arquivo temporário do bucket após OCR
            if (tempPath) {
              await supabase.storage.from('quote-uploads').remove([tempPath]).catch(() => {});
            }
            extractedText = `DADOS ESTRUTURADOS DA APÓLICE (JSON):\n${JSON.stringify(data.data, null, 2)}`;
          }
        }
      } catch (err) { console.error('⚠️ OCR Estruturado failed, fallback...', err); }

      // Fallback para extrator gemini raw se o OCR estruturado falhar
      if (!extractedText) {
        console.log(`📄 Fallback para OCR Genérico (extract-document)...`);
        try {
          const { data, error } = await supabase.functions.invoke('extract-document', { body: { fileUrl: att.data_url, fileType: att.file_type } })
          if (!error && data?.text) {
             console.log(`✅ OCR Genérico concluído.`);
             extractedText = data.text;
          }
        } catch (err) { console.error('⚠️ Document generic extraction failed:', err) }
      }

      if (extractedText) result.extractedTexts.push(extractedText);
    }
  }
  return result
}
