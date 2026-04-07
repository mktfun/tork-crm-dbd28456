export interface MaskedResult {
  originalText: string;
  maskedText: string;
  hasSensitiveData: boolean;
  replacements: Record<string, string>;
}

// Regex options to catch typical formats
const CPF_REGEX = /\b(?:\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})\b/g;
const CNPJ_REGEX = /\b(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d[\s\-]?){13,16}\b/g; 

export function scanAndMaskPII(text: string): MaskedResult {
  if (!text) {
    return { originalText: '', maskedText: '', hasSensitiveData: false, replacements: {} };
  }

  let maskedText = text;
  let hasSensitiveData = false;
  const replacements: Record<string, string> = {};

  let cpfCounter = 1;
  let cnpjCounter = 1;
  let ccCounter = 1;

  // Mask CPFs
  maskedText = maskedText.replace(CPF_REGEX, (match) => {
    hasSensitiveData = true;
    const token = `[CPF_REDACTED_${cpfCounter++}]`;
    replacements[token] = match;
    return token;
  });

  // Mask CNPJs
  maskedText = maskedText.replace(CNPJ_REGEX, (match) => {
    hasSensitiveData = true;
    const token = `[CNPJ_REDACTED_${cnpjCounter++}]`;
    replacements[token] = match;
    return token;
  });

  // Mask Credit Cards
  maskedText = maskedText.replace(CREDIT_CARD_REGEX, (match) => {
    // A quick validation to prevent false positives with generic numbers
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 16) {
      hasSensitiveData = true;
      const token = `[CREDIT_CARD_REDACTED_${ccCounter++}]`;
      replacements[token] = match;
      return token;
    }
    return match;
  });

  return {
    originalText: text,
    maskedText,
    hasSensitiveData,
    replacements
  };
}

export function unmaskPII(maskedText: string, replacements: Record<string, string>): string {
  if (!maskedText || !replacements || Object.keys(replacements).length === 0) {
    return maskedText;
  }

  let unmaskedText = maskedText;
  for (const [token, originalValue] of Object.entries(replacements)) {
    // Regex global to replace all token occurrences if repeated
    const safeRegexToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(safeRegexToken, 'g');
    unmaskedText = unmaskedText.replace(regex, originalValue);
  }

  return unmaskedText;
}

export async function logSecurityEvent(
  supabase: any,
  payload: {
    userId?: string | null;
    brokerageId?: number | null;
    chatwootConversationId?: number | null;
    eventType: 'pii_masked' | 'jailbreak_attempt' | 'unauthorized_access' | 'tool_rejection';
    originalTextEncrypted?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: any;
  }
) {
  try {
    const { error } = await supabase.from('crm_ai_security_events').insert({
      user_id: payload.userId || null,
      brokerage_id: payload.brokerageId || null,
      chatwoot_conversation_id: payload.chatwootConversationId || null,
      event_type: payload.eventType,
      original_text_encrypted: payload.originalTextEncrypted || null,
      severity: payload.severity || 'medium',
      metadata: payload.metadata || {}
    });

    if (error) {
      console.error('Failed to log AI security event:', error);
    }
  } catch (err) {
    console.error('Unexpected error logging AI security event:', err);
  }
}
