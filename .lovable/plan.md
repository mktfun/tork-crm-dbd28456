

# Plano: Mostrar ramo no modal mesmo sem apólice vinculada

## Problema

O agendamento salva `ramo_id` diretamente na tabela `appointments`, mas a query em `useSupabaseAppointments.ts` só busca o nome do ramo via o join com `apolices` (`policy:apolices(... ramo:ramos(nome))`). Quando o usuário seleciona um ramo sem vincular uma apólice, o `ramoName` vem `null`.

## Mudança

### `src/hooks/useSupabaseAppointments.ts`

Adicionar um join direto com `ramos` via o campo `ramo_id` da tabela `appointments`:

```
.select(`
  *,
  client:clientes(name, phone),
  policy:apolices(policy_number, ramo:ramos(nome)),
  direct_ramo:ramos(nome)
`)
```

No mapeamento, priorizar o ramo da apólice e usar o ramo direto como fallback:

```typescript
ramoName: apt.policy?.ramo?.nome || apt.direct_ramo?.nome || null,
```

| Arquivo | Ação |
|---|---|
| `src/hooks/useSupabaseAppointments.ts` | Adicionar join `direct_ramo:ramos(nome)` e fallback no mapeamento |

