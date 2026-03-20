

# Plano: Corrigir 2 bugs na tela de Automação

## Bug 1 — Missão "conclui do nada" enquanto digita

**Causa raiz**: O auto-save com debounce funciona assim:
1. Usuário digita → `mission` muda → debounce 1.5s → `onSaveConfig()` salva no banco
2. `onSuccess` do mutation chama `invalidateQueries(['crm-ai-settings'])` → re-fetch
3. Re-fetch atualiza `aiSetting` → `currentObjective` muda → `useEffect` linha 94 executa `setMission(currentObjective)` → **textarea reseta para o valor do banco enquanto o usuário ainda digita**
4. Toast "Configuração de IA salva com sucesso!" aparece a cada save, dando impressão de "concluído"

**Correção**:
- No `useEffect` de sync (linha 94-96): só sincronizar se o textarea **não estiver focado** (usar ref de foco)
- Remover o toast de sucesso do `upsertSetting` (ou trocar para toast silencioso/sem notificação para auto-saves)
- Alternativa mais simples: no `useEffect` de auto-save, não chamar `mutateAsync` (que mostra toast), e sim uma versão silenciosa

## Bug 2 — Follow-up não salva (dá erro)

**Causa raiz**: O `UpsertAiSettingParams` no hook `useCrmAiSettings.ts` **não inclui** os campos `follow_up_enabled`, `follow_up_interval_minutes`, `follow_up_max_attempts`, `follow_up_message`. O objeto de update/insert também não os passa. Quando o Switch de follow-up chama `onSaveConfig({ stage_id, follow_up_enabled: true })`, o mutation ignora o campo e o Supabase update envia `undefined` para tudo (setando campos para NULL).

**Correção**:
- Adicionar os 4 campos de follow-up ao `UpsertAiSettingParams`
- Incluí-los no `.update()` e `.insert()` do mutation
- Usar spread seletivo para não enviar `undefined` (que zera outros campos)

## Mudanças

| Arquivo | Ação |
|---|---|
| `src/hooks/useCrmAiSettings.ts` | Adicionar follow-up fields à interface e ao mutation. Mudar update para spread seletivo (só enviar campos presentes). |
| `src/components/automation/StageFlowCard.tsx` | Adicionar ref de foco no textarea de missão para evitar sync durante digitação |

## Detalhe técnico — Update seletivo

O problema fundamental é que o update **sempre envia todos os campos**, mesmo quando `undefined`. Isso faz com que salvar `follow_up_enabled: true` zere `ai_objective` (porque não foi passado). A correção é filtrar campos `undefined` antes do update:

```typescript
// Build update payload with only defined fields
const updatePayload: Record<string, any> = {};
if (params.ai_name !== undefined) updatePayload.ai_name = params.ai_name;
if (params.ai_objective !== undefined) updatePayload.ai_objective = params.ai_objective;
// ... same for all fields including follow_up_*
```

Isso garante que salvar só o follow-up não zere a missão, e vice-versa.

