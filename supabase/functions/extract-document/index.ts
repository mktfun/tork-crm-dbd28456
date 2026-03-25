import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

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
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))

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

    const aiResponse = await fetch(AI_GATEWAY_URL, {
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
      console.error(`❌ AI extraction failed: ${aiResponse.status} — ${errText}`)
      return new Response(JSON.stringify({ error: `AI extraction failed: ${aiResponse.status}` }), { status: 500 })
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
