

# Plano: Follow-up toggle não reflete estado real

## Problema

O Switch de follow-up salva corretamente no banco (o mutation funciona), mas a UI não reflete o valor salvo porque os campos de follow-up são **perdidos no mapeamento** dentro do hook `useCrmAiSettings.ts`.

Na linha 70-90, o `stages.map()` constrói manualmente cada campo do objeto `CrmAiSettingWithStage`, mas **não inclui** `follow_up_enabled`, `follow_up_interval_minutes`, `follow_up_max_attempts`, `follow_up_message`. O `select('*')` traz os dados do banco, mas eles são descartados no mapping.

Resultado: `aiSetting?.follow_up_enabled` é sempre `undefined` → `?? false` → Switch sempre desligado → a seção de configuração (intervalo, tentativas, mensagem) nunca aparece.

## Correção

| Arquivo | Ação |
|---|---|
| `src/hooks/useCrmAiSettings.ts` | (1) Adicionar 4 campos follow-up à interface `CrmAiSetting` (linhas 5-18). (2) Adicionar os mesmos 4 campos ao mapping do `stages.map()` (linhas 70-90), lendo de `setting?.follow_up_*` |

Mudança de ~8 linhas. Sem migration, sem deploy.

## Detalhe

No mapping (linha 73-89), adicionar:

```typescript
follow_up_enabled: setting?.follow_up_enabled ?? false,
follow_up_interval_minutes: setting?.follow_up_interval_minutes ?? 60,
follow_up_max_attempts: setting?.follow_up_max_attempts ?? 3,
follow_up_message: setting?.follow_up_message ?? '',
```

E na interface `CrmAiSetting` + `CrmAiSettingWithStage`, adicionar os tipos correspondentes.

