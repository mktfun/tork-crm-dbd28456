# Arquitetura: Test Mode Flow & Feedback RAG

## Banco de Dados
Duas tabelas simples criadas via Supabase Migration:
- `admin_test_sessions`: Registra `user_id`, `brokerage_id`, `phone` e `status` (active / feedback_pending).
- `ai_feedbacks`: Guarda `brokerage_id`, `type` ('sdr' ou 'mentor') e `feedback_text`.

## 1. Interceptação Pre-SDR (`index.ts`)
Mesmo antes do bloco *3. Admin delegation*, um novo bloco checará:
`Se senderRole === 'admin'`, consultar a presença de uma test session para o `phone`:
- Se enviar `/teste` e não houver test_session -> Inicia test_session e invoca chatwoot com msg `Modo teste ativado!`. Return.
- Se enviar `/teste` durante `active` -> Altera para `feedback_pending` e invoca chatwoot: `Teste finalizado. O que a IA precisaria melhorar nas respostas pra vender mais?`. Return.
- Se a mensagem orgânica chegar via `feedback_pending` -> Salva texto em `ai_feedbacks` (type=sdr), deleta a `test_session`. Return com `Obrigado pelo Feedback!`.
- Se a mensagem orgânica chegar durante `active` -> Muda forçadamente a variavel `senderRole = null` na memoria, e garante que vá para o roteamento convencional sem disparar o modulo `processAdminLogic`.

## 2. Injeção Dinâmica em SDR (`buildPrompt.ts`)
Ao final da função, será adicionada a varredura SQL:
```typescript
const { data: feedbacks } = await supabase.from('ai_feedbacks').select('feedback_text').eq('brokerage_id', brokerageId).eq('type', 'sdr').order('created_at', { ascending: false }).limit(5);

// append feedbacks to systemPrompt as guidelines...
```

## 3. Injeção Dinâmica de Análise (`processAdminLogic.ts`)
- Se a mensagem iniciar com `/feedback `, salvar o restante da mensagem em `ai_feedbacks` com tipo `mentor`. Exibir confirmação.
- Na hora de montar o comando `/start` de lote (ou mensagens avulsas), varrer a tabela pedindo `type='mentor'` limit 5, e colocar na instrução base do assistente.
