import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function getElevenLabsConfig(
  supabase: SupabaseClient,
  brokerageId: number,
  stageVoiceId?: string | null
) {
  // 1. Get from brokerage
  const { data: broker } = await supabase
    .from('brokerages')
    .select('elevenlabs_api_key, elevenlabs_voice_id, elevenlabs_model_id')
    .eq('id', brokerageId)
    .single()

  const apiKey = broker?.elevenlabs_api_key || Deno.env.get('ELEVENLABS_API_KEY')
  const voiceId = stageVoiceId || broker?.elevenlabs_voice_id || Deno.env.get('ELEVENLABS_DEFAULT_VOICE_ID')
  const modelId = broker?.elevenlabs_model_id || 'eleven_multilingual_v2'

  return { apiKey, voiceId, modelId }
}

export async function synthesizeAudio(
  supabase: SupabaseClient,
  text: string,
  config: { apiKey?: string; voiceId?: string; modelId?: string },
  brokerageId: number,
  conversationId: number
): Promise<string | null> {
  const { apiKey, voiceId, modelId } = config

  if (!apiKey || !voiceId || !text) {
    console.warn('ElevenLabs syntax skipped: missing apiKey, voiceId or text', { hasText: !!text, voiceId, hasApiKey: !!apiKey })
    return null
  }

  try {
    console.log(`🎙️ Calling ElevenLabs API: Voice ID ${voiceId}, Model ${modelId}`)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`ElevenLabs API error (${response.status}):`, errText)
      return null
    }

    const audioBlob = await response.blob()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${brokerageId}/${conversationId}/${timestamp}.mp3`

    console.log(`☁️ Uploading audio to Supabase Storage: ${fileName}`)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('sdr-audio')
      .upload(fileName, audioBlob, { contentType: 'audio/mpeg', upsert: false })

    if (uploadError) {
      console.error('Supabase storage upload failed:', uploadError.message)
      return null
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('sdr-audio')
      .getPublicUrl(uploadData.path)

    console.log(`✅ Audio successfully generated & hosted: ${publicUrlData.publicUrl}`)
    return publicUrlData.publicUrl

  } catch (err) {
    console.error('Unhandled error in ElevenLabs synthesis:', err)
    return null
  }
}
