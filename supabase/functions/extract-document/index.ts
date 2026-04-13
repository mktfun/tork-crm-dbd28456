import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const GOOGLE_AI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

Deno.serve(async (req) => {
  try {
    const { fileUrl, fileType } = await req.json()

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: 'fileUrl is required' }), { status: 400 })
    }

    console.log(`📄 extract-document: Downloading ${fileUrl} (type: ${fileType})`)

    // Download the file
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      console.error(`❌ Failed to download file: ${fileResponse.status}`)
      return new Response(JSON.stringify({ error: `Failed to download: ${fileResponse.status}` }), { status: 500 })
    }

    const fileBuffer = await fileResponse.arrayBuffer()

    // Limite de 5MB
    if (fileBuffer.byteLength > 5 * 1024 * 1024) {
      console.error(`❌ Arquivo excede 5MB: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
      return new Response(JSON.stringify({ error: 'Arquivo excede o limite de 5MB' }), { status: 400 })
    }

    console.log(`📄 Converting ${(fileBuffer.byteLength / 1024).toFixed(1)}KB to base64...`)

    // Conversão chunked para evitar stack overflow em arquivos grandes
    const bytes = new Uint8Array(fileBuffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    const base64Data = btoa(binary)

    // Determine MIME type
    let mimeType = fileType || 'application/pdf'
    if (fileUrl.match(/\.(jpg|jpeg)$/i)) mimeType = 'image/jpeg'
    else if (fileUrl.match(/\.png$/i)) mimeType = 'image/png'
    else if (fileUrl.match(/\.webp$/i)) mimeType = 'image/webp'
    else if (fileUrl.match(/\.pdf$/i)) mimeType = 'application/pdf'

    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'

    if (!isImage && !isPdf) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${mimeType}` }), { status: 400 })
    }

    console.log(`📄 File downloaded: ${(fileBuffer.byteLength / 1024).toFixed(1)}KB, mime: ${mimeType}`)

    // Use Gemini via gateway for OCR
    const extractionPrompt = isPdf
      ? 'Extraia TODO o texto deste documento PDF. Retorne o conteúdo completo, preservando a estrutura (títulos, parágrafos, tabelas, listas). Não resuma, não omita nada. Se houver tabelas, formate-as de forma legível.'
      : 'Extraia TODO o texto visível nesta imagem. Se for um documento, preserve a estrutura. Se for uma foto com texto, transcreva todo o texto visível. Retorne apenas o texto extraído.'

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: extractionPrompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ]
      }
    ]

    // Try Lovable gateway first, fallback to Google AI directly
    let aiResponse: Response

    if (LOVABLE_API_KEY) {
      console.log('🔑 Trying Lovable AI Gateway...')
      aiResponse = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          max_tokens: 8192,
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.warn(`⚠️ Lovable gateway failed (${aiResponse.status}): ${errText.substring(0, 200)}`)

        // Fallback to Google AI directly
        if (GOOGLE_AI_API_KEY) {
          console.log('🔑 Falling back to Google AI direct...')
          aiResponse = await fetch(GOOGLE_AI_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gemini-2.5-flash',
              messages,
              max_tokens: 8192,
            }),
          })

          if (!aiResponse.ok) {
            const errText2 = await aiResponse.text()
            console.error(`❌ Google AI also failed (${aiResponse.status}): ${errText2.substring(0, 200)}`)
            return new Response(JSON.stringify({ error: `AI extraction failed: ${aiResponse.status}` }), { status: 500 })
          }
        } else {
          console.error('❌ No GOOGLE_AI_API_KEY for fallback')
          return new Response(JSON.stringify({ error: `AI extraction failed: ${aiResponse.status}` }), { status: 500 })
        }
      }
    } else if (GOOGLE_AI_API_KEY) {
      console.log('🔑 Using Google AI direct (no Lovable key)...')
      aiResponse = await fetch(GOOGLE_AI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages,
          max_tokens: 8192,
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error(`❌ Google AI failed (${aiResponse.status}): ${errText.substring(0, 200)}`)
        return new Response(JSON.stringify({ error: `AI extraction failed: ${aiResponse.status}` }), { status: 500 })
      }
    } else {
      console.error('❌ No AI API keys configured')
      return new Response(JSON.stringify({ error: 'No AI API keys configured' }), { status: 500 })
    }

    const aiData = await aiResponse.json()
    const extractedText = aiData.choices?.[0]?.message?.content || ''

    console.log(`✅ Extracted ${extractedText.length} chars from ${isPdf ? 'PDF' : 'image'}`)

    return new Response(JSON.stringify({ text: extractedText }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ extract-document error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
