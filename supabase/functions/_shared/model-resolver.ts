const MODEL_GATEWAY_MAP: Record<string, string> = {
  // Gemini
  'gemini-3.1-pro': 'google/gemini-3.1-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  // OpenAI
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'o3': 'openai/o3',
};

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export interface ResolvedModel {
  model: string;
  apiKey: string | null;
  provider: string | null;
}

/**
 * Resolve the AI model and API key from the user's global config (crm_ai_global_config).
 * Falls back to google/gemini-2.5-flash if not configured or unsupported.
 */
export async function resolveUserModel(
  supabase: any,
  userId: string
): Promise<ResolvedModel> {
  try {
    const { data } = await supabase
      .from('crm_ai_global_config')
      .select('ai_model, ai_provider, api_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data?.ai_model) return { model: DEFAULT_MODEL, apiKey: data?.api_key || null, provider: data?.ai_provider || null };

    const gatewayModel = MODEL_GATEWAY_MAP[data.ai_model];
    if (gatewayModel) return { model: gatewayModel, apiKey: data.api_key || null, provider: data.ai_provider || null };

    // Unsupported provider (grok, anthropic, deepseek) — fallback
    console.warn(`[MODEL-RESOLVER] Model "${data.ai_model}" (provider: ${data.ai_provider}) not supported on gateway, using fallback`);
    return { model: DEFAULT_MODEL, apiKey: data.api_key || null, provider: data.ai_provider || null };
  } catch (err) {
    console.error('[MODEL-RESOLVER] Error fetching config:', err);
    return { model: DEFAULT_MODEL, apiKey: null, provider: null };
  }
}
