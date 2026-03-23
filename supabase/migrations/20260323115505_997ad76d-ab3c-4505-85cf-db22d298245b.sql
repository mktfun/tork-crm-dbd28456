CREATE UNIQUE INDEX IF NOT EXISTS crm_deals_unique_open_conversation 
ON crm_deals (chatwoot_conversation_id) 
WHERE chatwoot_conversation_id IS NOT NULL;