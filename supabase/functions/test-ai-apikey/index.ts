import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const PROVIDER_ENDPOINTS: Record<string, { url: string; model?: string }> = {
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models", model: "gemini-2.0-flash" },
  openai: { url: "https://api.openai.com/v1/models" },
  anthropic: { url: "https://api.anthropic.com/v1/models" },
  grok: { url: "https://api.x.ai/v1/models" },
  deepseek: { url: "https://api.deepseek.com/models" },
}

Deno.serve(async (req) => {
  try {
    const { provider, model, api_key } = await req.json()

    if (!provider || !api_key) {
      return new Response(JSON.stringify({ success: false, message: "Parâmetros inválidos" }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    const endpoint = PROVIDER_ENDPOINTS[provider]
    if (!endpoint) {
      return new Response(JSON.stringify({ success: false, message: `Provedor '${provider}' não suportado` }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    let testUrl = endpoint.url
    let headers: Record<string, string> = { "Content-Type": "application/json" }

    if (provider === "gemini") {
      // Gemini usa query param key
      testUrl = `${endpoint.url}?key=${api_key}`
    } else if (provider === "anthropic") {
      headers["x-api-key"] = api_key
      headers["anthropic-version"] = "2023-06-01"
    } else {
      headers["Authorization"] = `Bearer ${api_key}`
    }

    const resp = await fetch(testUrl, { method: "GET", headers })

    if (resp.ok) {
      return new Response(JSON.stringify({ success: true, message: `Chave válida para ${provider}` }), {
        headers: { "Content-Type": "application/json" }
      })
    } else {
      const errBody = await resp.text()
      const isUnauth = resp.status === 401 || resp.status === 403
      return new Response(JSON.stringify({
        success: false,
        message: isUnauth ? "Chave inválida ou sem permissão" : `Erro ${resp.status}: ${errBody.substring(0, 120)}`
      }), { headers: { "Content-Type": "application/json" } })
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
