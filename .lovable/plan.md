

# Plano: Corrigir admin detection para Joaci Barros + limpar historico

## Problema

Existem **2 produtores** com o mesmo telefone `11947645967` no banco:
- `joacir filho` (brokerage 8, email: assessorbmf@gmail.com)
- `Joaci Barros` (brokerage 11 — JJ&Amorim)

O `resolveContext.ts` usa `.maybeSingle()` na query de producers por telefone. Quando retorna 2+ rows, o Supabase retorna **erro** em vez de dados — então a deteccao de admin **nunca funciona** para esse numero.

Quanto ao historico: nao existe nenhum registro em `admin_chat_history` para esse telefone, entao nao ha nada para limpar.

## Solucao

### 1. Remover o produtor duplicado (via SQL insert tool)

O produtor `joacir filho` (id: `86d040a4-a7b5-468b-a711-89b2a19261d5`, brokerage 8) parece ser um cadastro duplicado. Deletar ele para que reste apenas `Joaci Barros` (brokerage 11).

```sql
DELETE FROM producers WHERE id = '86d040a4-a7b5-468b-a711-89b2a19261d5';
```

### 2. Tornar o resolveContext mais robusto (codigo)

Trocar `.maybeSingle()` por `.limit(1).maybeSingle()` na query de producers por telefone no `resolveContext.ts` (linha 74). Assim, mesmo que existam duplicatas futuras, pega o primeiro resultado sem erro.

```typescript
// Linha 71-75: adicionar .limit(1) antes de .maybeSingle()
const { data: producer } = await supabase
  .from('producers')
  .select('id, brokerage_id')
  .ilike('phone', `%${normalizedPhone}%`)
  .limit(1)
  .maybeSingle()
```

### 3. Deploy do chatwoot-dispatcher

## Resultado

- Joaci Barros (11947645967) sera detectado como admin automaticamente pelo bot
- Sem risco de quebra futura por duplicatas de telefone
- Historico limpo (ja esta vazio)

