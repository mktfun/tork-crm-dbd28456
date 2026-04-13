import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PROVIDER_ENDPOINTS: Record<string, { url: string; model?: string }> = {
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models", model: "gemini-2.0-flash" },
  openai: { url: "https://api.openai.com/v1/models" },
  anthropic: { url: "https://api.anthropic.com/v1/models" },
  grok: { url: "https://api.x.ai/v1/models" },
  deepseek: { url: "https://api.deepseek.com/models" },
}

function parseErrorMessage(provider: string, status: number, body: string): string {
  try {
    const json = JSON.parse(body)
    const msg = json?.error?.message || json?.message || json?.error || ''
    const msgLower = String(msg).toLowerCase()

    // Detect invalid key patterns
    if (
      status === 400 || status === 401 || status === 403 ||
      msgLower.includes('api key not valid') ||
      msgLower.includes('invalid api key') ||
      msgLower.includes('unauthorized') ||
      msgLower.includes('invalid x-api-key') ||
      msgLower.includes('permission denied') ||
      msgLower.includes('authentication')
    ) {
      return `Chave inválida para ${provider}. Verifique se a chave está correta e tem as permissões necessárias.`
    }

    if (msgLower.includes('quota') || msgLower.includes('rate limit') || msgLower.includes('exceeded')) {
      return `Chave válida, mas a cota do ${provider} foi excedida. Verifique seu plano de uso.`
    }

    if (msgLower.includes('billing') || msgLower.includes('payment')) {
      return `Chave válida, mas há um problema de faturamento na conta do ${provider}.`
    }

    return `Erro do ${provider} (${status}): ${String(msg).substring(0, 200)}`
  } catch {
    // Body is not JSON
    const bodyLower = body.toLowerCase()
    if (
      status === 400 || status === 401 || status === 403 ||
      bodyLower.includes('api key') ||
      bodyLower.includes('unauthorized')
    ) {
      return `Chave inválida para ${provider}. Verifique se a chave está correta.`
    }
    return `Erro do ${provider} (${status}): ${body.substring(0, 200)}`
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { provider, model, api_key } = await req.json()

    if (!provider || !api_key) {
      return new Response(JSON.stringify({ success: false, message: "Parâmetros inválidos: provider e api_key são obrigatórios" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const endpoint = PROVIDER_ENDPOINTS[provider]
    if (!endpoint) {
      return new Response(JSON.stringify({ success: false, message: `Provedor '${provider}' não suportado. Provedores disponíveis: ${Object.keys(PROVIDER_ENDPOINTS).join(', ')}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let testUrl = endpoint.url
    let headers: Record<string, string> = { "Content-Type": "application/json" }

    if (provider === "gemini") {
      testUrl = `${endpoint.url}?key=${api_key}`
    } else if (provider === "anthropic") {
      headers["x-api-key"] = api_key
      headers["anthropic-version"] = "2023-06-01"
    } else {
      headers["Authorization"] = `Bearer ${api_key}`
    }

    const resp = await fetch(testUrl, { method: "GET", headers })

    if (resp.ok) {
      return new Response(JSON.stringify({ success: true, message: `✅ Chave válida para ${provider}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const errBody = await resp.text()
    const friendlyMessage = parseErrorMessage(provider, resp.status, errBody)

    return new Response(JSON.stringify({
      success: false,
      message: friendlyMessage
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: `Erro interno ao testar chave: ${(err as Error).message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
