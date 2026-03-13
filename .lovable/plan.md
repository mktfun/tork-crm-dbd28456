

# Fix: Cores das etiquetas não sendo enviadas pro Chatwoot

## Problema
Na linha 646 do `chatwoot-sync/index.ts`, o código faz `rawColor.replace('#', '')` e nunca re-adiciona o `#`. A API do Chatwoot espera cores no formato `#RRGGBB`. Resultado: todas as labels ficam sem cor (transparentes).

## Correção

**Arquivo:** `supabase/functions/chatwoot-sync/index.ts`

Linha 646 — após validar o hex, re-adicionar o `#`:

```typescript
// Após validação, garantir formato #RRGGBB
let labelColor = rawColor.replace('#', '').toUpperCase();
if (!/^[0-9A-F]{6}$/i.test(labelColor)) {
  labelColor = '3B82F6';
}
if (labelColor === '000000') {
  labelColor = '3B82F6';
}
// Chatwoot API expects #RRGGBB format
const labelColorHex = `#${labelColor}`;
```

Depois, substituir todas as referências a `labelColor` dentro desse case (linhas 666-701) por `labelColorHex` nos payloads de `color`.

## Resultado
Ao clicar "Forçar Sync: Funil", as etiquetas serão criadas/atualizadas com a cor correta de cada etapa do pipeline.

