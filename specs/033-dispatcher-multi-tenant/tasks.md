# Checklist: Implementação de Falhas e CleanUps do Multi-Tenant

- [x] **1. Ajustar `resolveContext.ts`:**
  - Extrair lógica de `normalizePhone` para focar estritamente na remoção de espaços/símbolos mantendo o sufixo numérico (slice -11).
  - Bloquear verificação de produtores global usando `.not('phone', 'is', null)`. Em seu lugar, usar `.eq('brokerage_id', brokerageId)`. Se não houver `brokerageId` resolvido nos passos anteriores, não permitir promoção à Admin em hipótese alguma.
  - Ajustar lógica para corretoras para checar se o ID do Brokerage confere de fato com o escopo atual, ou descontinuar a busca transversal se ela for inerentemente perigosa (limitar-se somente aos produtores/brokers autorizados na tenant).
- [x] **2. Higienizar `processAdminLogic.ts`:**
  - Remover as strings fixadas de `[MODO WHATSAPP ATIVADO...]` de instrução do final do append de contents.
- [x] **3. Tratar Erros de Build Remanescentes (Opcional se desfeito):**
  - Checar as Edge Functions (`google-auth-callback`, `google-auth-url`, `google-sync`, `google-sync-immediate`) e precaver `error as Error` para a propriedade `.message` do log final.
  - Aplicar casting de `(supabase as any).from("google_sync_tokens")` em `IntegrationSettings.tsx` para evitar travamentos de tipagem em deploy.
- [x] **4. Database CleanUp:**
  - Rodar em Supabase SQL Dashboard ou via CLI command a query de expurgo: `DELETE FROM admin_chat_history WHERE phone_number LIKE '%956076123%';`
