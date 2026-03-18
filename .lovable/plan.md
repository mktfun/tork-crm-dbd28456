

# Plano: Auto-criação de Deal com IA (Pipeline + Produto inteligente)

## Problema

O `autoCreateDeal` atual pega cegamente o pipeline padrão e a primeira etapa. Se o lead fala de "sinistro", "consórcio" ou "fiança", ele cai no funil errado. Além disso, não vincula nenhum `crm_product`.

## Solução

Substituir a lógica fixa do `autoCreateDeal` por uma chamada rápida à IA (Gemini Flash) que recebe:
- A mensagem do cliente (+ transcrição/OCR se houver)
- A lista de pipelines com suas etapas
- A lista de produtos cadastrados (`crm_products`)

A IA retorna um JSON com `pipeline_id`, `stage_id` e `product_id` (ou null).

## Alteração única: `supabase/functions/chatwoot-dispatcher/index.ts`

### Reescrever `autoCreateDeal`

A nova função recebe parâmetros extras: `messageContent`, `transcription`, `extractedText`.

Fluxo:
1. Buscar todos os pipelines do usuário com suas etapas (`crm_pipelines` + `crm_stages`)
2. Buscar todos os produtos ativos (`crm_products` onde `is_active=true`)
3. Montar um prompt curto para Gemini Flash:

```text
Dado o contexto da mensagem do cliente e as opções disponíveis, escolha o melhor funil, etapa inicial e produto.

Mensagem: "{messageContent}"

Funis disponíveis:
- Pipeline "Seguros" (id: xxx): etapas [Novo Lead (id: aaa), Em Contato (id: bbb), ...]
- Pipeline "Sinistros" (id: yyy): etapas [Abertura (id: ccc), ...]

Produtos disponíveis:
- "Seguro Auto" (id: p1)
- "Consórcio" (id: p2)
- ...

Responda APENAS com JSON: {"pipeline_id":"...","stage_id":"...","product_id":"..." ou null}
Use a primeira etapa do funil escolhido como stage_id.
Se não conseguir determinar o produto, use null.
```

4. Parsear o JSON retornado
5. **Fallback**: se a IA falhar ou retornar inválido → usar pipeline padrão (`is_default=true`) + primeira etapa, sem produto (comportamento atual)
6. Criar o deal com `product_id` incluso no INSERT

### Ajustar chamada do `autoCreateDeal` (linha ~692)

Passar `content`, `mediaResult.transcription` e `mediaResult.extractedText` como parâmetros extras.

### Payload ao n8n

Adicionar `product_id` e `product_name` ao `derived_data` (já existe `product_id` na tabela `crm_deals`).

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Reescrever `autoCreateDeal` com classificação por IA + vincular produto |

## Deploy

Deploy da edge function `chatwoot-dispatcher` após alteração.

