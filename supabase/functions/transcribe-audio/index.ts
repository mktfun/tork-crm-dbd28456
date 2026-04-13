import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

Deno.serve(async (req) => {
  try {
    const { audioUrl } = await req.json()

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'audioUrl is required' }), { status: 400 })
    }

    console.log(`🎤 transcribe-audio: Downloading ${audioUrl}`)

    // Download the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      console.error(`❌ Failed to download audio: ${audioResponse.status}`)
      return new Response(JSON.stringify({ error: `Failed to download: ${audioResponse.status}` }), { status: 500 })
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    // Determine MIME type from URL
    let mimeType = 'audio/ogg'
    if (audioUrl.match(/\.mp3$/i)) mimeType = 'audio/mp3'
    else if (audioUrl.match(/\.wav$/i)) mimeType = 'audio/wav'
    else if (audioUrl.match(/\.m4a$/i)) mimeType = 'audio/m4a'
    else if (audioUrl.match(/\.ogg$/i)) mimeType = 'audio/ogg'

    console.log(`🎤 Audio downloaded: ${(audioBuffer.byteLength / 1024).toFixed(1)}KB, mime: ${mimeType}`)

    // Use Gemini via gateway for transcription
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcreva este áudio em português brasileiro. Retorne APENAS a transcrição, sem comentários, timestamps ou formatação extra. Se o áudio estiver inaudível ou vazio, retorne "[áudio inaudível]".'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ]
      }
    ]

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 4096,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error(`❌ AI transcription failed: ${aiResponse.status} — ${errText}`)
      return new Response(JSON.stringify({ error: `AI transcription failed: ${aiResponse.status}` }), { status: 500 })
    }

    const aiData = await aiResponse.json()
    const transcription = aiData.choices?.[0]?.message?.content || ''

    console.log(`✅ Transcribed ${transcription.length} chars from audio`)

    return new Response(JSON.stringify({ text: transcription }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ transcribe-audio error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
