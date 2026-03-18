

# Plano: Dispatcher Assume Roteamento e Progressão de Etapas

## Problema Atual

O dispatcher delega duas decisões críticas para a IA via function calling (tools), o que causa problemas no n8n:
1. **Lead sem deal** → IA precisa chamar `list_pipelines_and_stages` + `create_deal` (lento, inconsistente)
2. **Conclusão de objetivo** → IA decide sozinha quando chamar `update_deal_stage` (sem validação)

## Solução: Dispatcher faz tudo antes de enviar ao n8n

### 1. Auto-criação de deal para leads sem negociação (linhas 246-258)

Quando `!deal` e o cliente já existe (`clientId` presente):
- Buscar o pipeline padrão (`is_default = true`) do usuário
- Buscar a primeira etapa desse pipeline (`position` menor)
- Criar o deal automaticamente via INSERT em `crm_deals`
- Carregar as `crm_ai_settings` dessa etapa
- Montar o prompt com o objetivo da etapa (não mais o bloco genérico "CLIENTE NOVO")

Se o cliente não existe ainda (`!clientId`): manter o prompt pedindo que o n8n/IA crie o contato primeiro, e na próxima mensagem o dispatcher já terá o cliente e criará o deal.

**Resultado**: O payload enviado ao n8n já inclui `deal_id`, `stage_id`, `pipeline_id` e o prompt correto da etapa — sem depender de function calling.

### 2. Detecção de conclusão de objetivo (pré-avaliação)

Após montar o prompt para deals existentes, o dispatcher faz uma chamada rápida à IA (Gemini Flash) com um prompt curto de avaliação:

```
Dado o objetivo: "{ai_objective}"
E o histórico recente da conversa: "{últimas mensagens}"
O objetivo foi atingido? Responda APENAS "SIM" ou "NAO".
```

- Se **SIM**: o dispatcher executa o `update_deal_stage` (move para próxima etapa ou `target_stage_id` configurado) ANTES de enviar ao n8n. O payload incluirá `stage_completed: true` e os dados da nova etapa.
- Se **NAO**: fluxo normal, o prompt continua com o objetivo atual.

Para buscar as últimas mensagens, o dispatcher consultará a API do Chatwoot (usando as credenciais da `brokerages`) para pegar as ~5 últimas mensagens da conversa.

### 3. Payload enriquecido ao n8n

O `derived_data` passará a incluir:
- `auto_created_deal: true/false` — indica se o deal foi criado neste request
- `stage_completed: true/false` — indica se o objetivo foi atingido e a etapa avançou
- `previous_stage_id` / `previous_stage_name` — se houve progressão

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Adicionar auto-criação de deal + pré-avaliação de objetivo |

## Deploy

Deploy automático da edge function `chatwoot-dispatcher` após alteração.

