

# Plano: Deploy + Bateria de Testes do Dispatcher

## Status do Código

Todas as correções estão aplicadas no código atual:
- `resolveContext.ts`: `brokerage_id` removido do select de profiles, resolução via tabela `brokerages`, upsert trocado por insert com fallback por `chatwoot_contact_id`
- `resolveDeal.ts`: `.eq('status', 'open')` removido, guard clause `clientId` antes de autoCreateDeal, fix array `crm_stages`
- `model-resolver.ts`: `SupabaseClient` trocado por `any`
- `index.ts`: `role || 'user'` no fallback, `resolvedAI` local ao `processWebhook`

## Passo 1: Deploy

Fazer deploy das Edge Functions afetadas:
- `chatwoot-dispatcher` (principal)

## Passo 2: Bateria de Testes (3 cenários)

### Cenário 1: Saudação genérica — contato NOVO (telefone inexistente)
Payload simulando "Bom dia!" de um contato com telefone novo, inbox_id mapeado.

**Validações**:
- resolveContext resolve userId e brokerageId (via profiles + brokerages)
- Auto-registro do cliente funciona (insert direto, sem upsert)
- clientId retornado nao-null
- AI classifica como null (saudação) → nenhum deal criado
- dispatchToN8n com hasDeal: false
- Nenhum deal órfão no banco

### Cenário 2: Mensagem com intenção — "Quero cotação de seguro auto"
Mesmo contato ou contato novo com mensagem específica.

**Validações**:
- Auto-registro funciona (se contato novo)
- clientId preenchido
- AI classifica pipeline + produto corretos
- Deal criado COM client_id preenchido (nao null)
- Label aplicada no Chatwoot
- Follow-up criado se configurado
- Nenhum deal órfão

### Cenário 3: Mensagem outgoing
Payload com message_type = "outgoing".

**Validações**:
- Retorna `{ message: "Ignored event" }` imediatamente
- Nenhum processamento executado

### Cenário 4 (bonus): Contato já existente com deal aberto
Validar que `resolveDeal` encontra o deal existente (sem `.eq('status','open')`) e nao duplica.

## Passo 3: Verificação de Dados

Após os testes, queries no banco para:
- Confirmar clientes auto-registrados (novos registros em `clientes`)
- Confirmar deals criados com `client_id` preenchido
- Confirmar ausência de deals órfãos (`client_id IS NULL`)
- Verificar follow-ups válidos

## Passo 4: Relatório Final

Relatório consolidado com os 4 cenários, fluxo passo-a-passo, bugs encontrados (se houver) e status de cada validação.

## Arquivos envolvidos no deploy
| Função | Motivo |
|---|---|
| `chatwoot-dispatcher` | Todas as correções de resolveContext, resolveDeal, index |

