import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Redis } from "https://esm.sh/@upstash/redis@1.31.5";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@1.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting (optional - uses Redis if configured)
let ratelimit: Ratelimit | null = null;
try {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (redisUrl && redisToken) {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"), // 20 requests per minute for sandbox
      analytics: true,
      prefix: "@upstash/ratelimit/sandbox",
    });
  }
} catch (e) {
  console.log('Redis not configured, skipping rate limiting');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, userId, mode, config } = await req.json();

    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    // Rate limiting check
    if (ratelimit) {
      const { success } = await ratelimit.limit(userId);
      if (!success) {
        return new Response(
          JSON.stringify({ error: "Limite de testes excedido. Aguarde um minuto." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Sandbox request for user:', userId);
    console.log('Mode:', mode);
    console.log('Config:', JSON.stringify(config));

    // Build messages with custom system prompt
    const aiMessages = [
      { role: 'system', content: systemPrompt || 'Você é um assistente útil.' },
      ...messages
    ];

    // Call AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        max_tokens: 500, // Keep responses short for sandbox testing
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da IA excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos na sua conta Lovable." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const result = await response.json();
    const assistantMessage = result.choices?.[0]?.message?.content || '';

    // Analyze response for formatting violations
    const violations = analyzeViolations(assistantMessage);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        response: assistantMessage,
        violations,
        config_used: config,
        mode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in ai-sandbox:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Server-side violation detection (mirrors client-side for redundancy)
function analyzeViolations(text: string): string[] {
  const violations: string[] = [];
  
  // Check for colons (except in time formats)
  const colonMatches = text.match(/:/g);
  const timePatterns = text.match(/\d{1,2}[h:]\d{2}/g) || [];
  if (colonMatches && colonMatches.length > timePatterns.length) {
    violations.push('colon');
  }
  
  // Check for semicolons
  if (text.includes(';')) {
    violations.push('semicolon');
  }
  
  // Check for numbered lists
  if (/^\s*\d+\.\s/m.test(text)) {
    violations.push('numbered_list');
  }
  
  // Check for bullet points
  if (/[•\-–—]\s/.test(text) || /^\s*[\-\*]\s/m.test(text)) {
    violations.push('bullets');
  }
  
  // Check for robotic phrases
  const roboticPhrases = ['segue abaixo', 'conforme solicitado', 'em anexo', 'a seguir', 'prezado', 'atenciosamente'];
  const lowerText = text.toLowerCase();
  for (const phrase of roboticPhrases) {
    if (lowerText.includes(phrase)) {
      violations.push('robotic_phrase');
      break;
    }
  }
  
  // Check for emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(text)) {
    violations.push('emoji');
  }
  
  return violations;
}
