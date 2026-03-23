

# Plano: Corrigir 3 bugs (Follow-up toggle, Follow-up não para, Objetivo não muda etapa)

## Bug 1 — Toggle de follow-up não se mexe visualmente

**Causa raiz**: A interface `AiSetting` em `SalesFlowTimeline.tsx` (linha 27-36) não tem os campos `follow_up_enabled`, `follow_up_interval_minutes`, `follow_up_max_attempts`, `follow_up_message`. Quando o `aiSettingsMap` passa os dados para o `StageFlowCard`, esses campos não são tipados e o `checked={aiSetting?.follow_up_enabled ?? false}` sempre retorna `false` porque a prop não carrega o valor real do banco.

O `onSaveConfig` salva corretamente (o hook já aceita follow-up fields), mas a UI não reflete porque a leitura usa um tipo incompleto.

**Correção**: Adicionar os 4 campos de follow-up à interface `AiSetting` em `SalesFlowTimeline.tsx`.

## Bug 2 — Follow-up não para quando cliente responde

**Causa raiz**: O fluxo do dispatcher é:
1. BLOCO A (linha 989): Cancela follow-ups pendentes → status `responded` ✅
2. BLOCO C (linha 1180): Cria NOVO follow-up se o n8n respondeu com URL ou keyword ❌

Resultado: o follow-up antigo é cancelado, mas um novo é imediatamente criado. O cliente responde, mas o bot trata a resposta do n8n como motivo para criar outro follow-up.

**Correção**: No BLOCO C, não criar follow-up se a mensagem atual veio do cliente (ou seja, se houve um cancelamento no BLOCO A). Adicionar uma flag `clientJustResponded` setada no BLOCO A e checada no BLOCO C.

## Bug 3 — Dispatcher não muda de etapa corretamente

O `evaluateObjectiveCompletion` (linha 1085) já existe e roda. Mas ele só executa se `stageAiSettings?.ai_objective` existir. Olhando os logs do usuário, o deal foi criado na etapa "Novo Lead" — se essa etapa não tem `ai_objective` configurado no `crm_ai_settings`, o bloco é ignorado completamente.

Isso não é bug de código — é um problema de **configuração faltando** (o Bug 1 impede configurar corretamente). Com o Bug 1 corrigido, o usuário poderá configurar os objetivos por etapa e a movimentação automática funcionará.

Porém, há uma melhoria a fazer: quando a etapa muda automaticamente, o dispatcher deveria **sincronizar a label no Chatwoot** (assim como faz na criação). Atualmente, `evaluateObjectiveCompletion` move o deal mas não atualiza a label.

**Correção**: Após mover deal em `evaluateObjectiveCompletion`, aplicar a nova label da stage na conversa do Chatwoot (mesma lógica que já existe no `autoCreateDeal`).

## Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/automation/SalesFlowTimeline.tsx` | Adicionar 4 campos follow-up à interface `AiSetting` (linhas 27-36) |
| `supabase/functions/chatwoot-dispatcher/index.ts` | (1) Adicionar flag `clientJustResponded` no BLOCO A, checar no BLOCO C para não criar follow-up desnecessário. (2) Após move de etapa em `evaluateObjectiveCompletion`, sincronizar label no Chatwoot |

Sem migration. Deploy do dispatcher necessário.

