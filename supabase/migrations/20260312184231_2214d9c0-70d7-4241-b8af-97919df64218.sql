-- Sync chatwoot config: when crm_settings has newer/different data, copy to brokerages
UPDATE public.brokerages b
SET 
  chatwoot_url = cs.chatwoot_url,
  chatwoot_token = cs.chatwoot_api_key,
  chatwoot_account_id = cs.chatwoot_account_id,
  updated_at = now()
FROM public.crm_settings cs
WHERE cs.user_id = b.user_id
  AND cs.chatwoot_url IS NOT NULL
  AND cs.chatwoot_api_key IS NOT NULL
  AND cs.chatwoot_account_id IS NOT NULL
  AND cs.updated_at > b.updated_at
  AND (
    COALESCE(b.chatwoot_url, '') <> COALESCE(cs.chatwoot_url, '')
    OR COALESCE(b.chatwoot_token, '') <> COALESCE(cs.chatwoot_api_key, '')
    OR COALESCE(b.chatwoot_account_id, '') <> COALESCE(cs.chatwoot_account_id, '')
  );