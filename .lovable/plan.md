

# Plano: Fix apólices importadas sem agendamento de renovação

## Diagnóstico (com prova real do banco)

**Dados encontrados:**
- 268 apólices importadas jan-mar com `automatic_renewal=true` → TODAS têm agendamento criado (trigger funciona)
- 34 apólices importadas jan-mar com `automatic_renewal=false` e status `Ativa` → 18 dessas vencem em 2027+ e **NÃO têm agendamento**
- 4 apólices com `automatic_renewal=true` mas status `Orçamento` → trigger ignora (correto)

**Causa raiz:** No `policyImportService.ts` (linha 1531), o import define `automatic_renewal: !isOrcamento`. Apólices importadas como Orçamento recebem `automatic_renewal=false`. Quando depois são ativadas via `ativarEAnexarPdf`, o update (linha 360-366) muda o status para `Ativa` mas **NÃO seta `automatic_renewal=true`**. O trigger `handle_policy_renewal_schedule` exige AMBOS `status='Ativa' AND automatic_renewal=true`, então nunca cria o agendamento.

## Solução (2 partes)

### 1. Fix no código: `ativarEAnexarPdf` deve setar `automatic_renewal=true`

**Arquivo:** `src/hooks/useSupabasePolicies.ts`, linhas 360-366

Adicionar `automatic_renewal: true` no update quando o status muda de "Aguardando Apólice" para "Ativa":

```typescript
const { error } = await supabase
  .from('apolices')
  .update({
    status: newStatus,
    pdf_attached_name: file.name,
    pdf_attached_data: pdfBase64,
    ...(newStatus === 'Ativa' ? { automatic_renewal: true } : {})
  })
```

### 2. Corrigir dados existentes via migration

Executar SQL que:
1. Atualiza as 34 apólices ativas com `automatic_renewal=false` para `true` — o trigger `AFTER UPDATE` vai disparar automaticamente e criar os agendamentos de renovação que faltam
2. Isso é seguro porque o trigger já tem lógica de "upsert" (não duplica se já existir agendamento para o mesmo ciclo/ano)

```sql
UPDATE apolices 
SET automatic_renewal = true, updated_at = now()
WHERE status = 'Ativa' 
  AND automatic_renewal = false;
```

## Resultado

- As 18+ apólices ativas sem agendamento terão seus agendamentos criados automaticamente pelo trigger
- Futuras ativações de orçamentos criarão agendamento corretamente
- Zero mudança no frontend — tudo é backend/trigger

