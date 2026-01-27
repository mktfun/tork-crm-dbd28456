
# Plano: Correção Definitiva do Nome "Ra Jj" + Popover de Vinculação

## Diagnóstico Confirmado

Descobri que **4 clientes no banco estão com nome "Ra Jj"**:

| CPF | ID |
|-----|-----|
| 35939607888 | 9acee241-9ad4-48f0-96c1-bcc37feb7dd5 |
| 22699965855 | c54a2c41-e017-4b4b-9ce3-3c0256524aeb |
| 21617669881 | e54110c8-aa69-41ab-8e16-d7015db8eaee |
| 31897639848 | 952c4b17-6c38-42d3-8067-e0147d5f6b65 |

O problema não é o código novo - é que **o lixo já foi persistido no banco** quando o código antigo rodou. O fluxo atual:

```text
Import PDF → OCR → Parser v5.2 (filtra "Ra Jj") → Busca CPF no banco → 
ENCONTRA cliente "Ra Jj" → Retorna nome do banco (lixo persistido)
```

---

## Correção em 2 Frentes

### Frente 1: Limpar Dados do Banco (Imediato)

Executar SQL para atualizar os 4 clientes com nome "Ra Jj" para "Cliente Importado":

```sql
UPDATE clientes 
SET name = 'Cliente Importado', updated_at = NOW() 
WHERE name = 'Ra Jj';
```

Isso resolve o problema para os registros existentes.

### Frente 2: Validar Nome do Banco (Código)

**Arquivo**: `src/services/policyImportService.ts`

Modificar `upsertClientByDocument` para validar se o nome do cliente EXISTENTE no banco também é lixo:

```typescript
if (existing) {
  // v5.3: Se o nome do banco também é lixo, considera como "a atualizar"
  const dbNameIsValid = isValidClientName(existing.name);
  const finalName = dbNameIsValid ? existing.name : sanitizeClientName(nome);
  
  // Se nome do banco era lixo, atualiza com nome melhor do OCR ou default
  if (!dbNameIsValid && finalName !== existing.name) {
    await supabase
      .from('clientes')
      .update({ name: finalName })
      .eq('id', existing.id);
    console.log(`🔄 [UPSERT] Nome atualizado: "${existing.name}" → "${finalName}"`);
  }
  
  return { id: existing.id, created: false, name: finalName };
}
```

Isso garante que:
1. Se o nome no banco é válido → usa nome do banco
2. Se o nome no banco é lixo → atualiza com nome melhor ou "Cliente Importado"

---

## Frente 3: Popover de Vinculação (Verificação)

O código do Popover ESTÁ implementado corretamente (linhas 1021-1063 do ImportPoliciesModal.tsx). Se não está funcionando, pode ser:

1. **Z-index**: O popover pode estar atrás de outros elementos
2. **Evento propagation**: O click pode estar sendo consumido pela TableRow

Correção sugerida:

```typescript
// Adicionar stopPropagation para evitar que TableRow consuma o click
<PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
```

E garantir z-index alto no PopoverContent:

```typescript
<PopoverContent className="w-64 bg-zinc-900 border-zinc-700 p-3 z-[100]" side="top">
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| *Banco de dados* | Limpar registros "Ra Jj" existentes |
| `src/services/policyImportService.ts` | Validar nome do banco e atualizar se for lixo |
| `src/components/policies/ImportPoliciesModal.tsx` | Adicionar `stopPropagation` e z-index no Popover |

---

## Resultado Esperado

1. **Clientes existentes com lixo**: Serão atualizados automaticamente na próxima importação
2. **Popover de auditoria**: Abrirá ao clicar no badge "Vinculado"
3. **Proteção futura**: Nomes lixo nunca mais serão persistidos (validação dupla)

---

## Detalhes Técnicos

### isValidClientName (já implementado)

A função rejeita nomes com:
- Menos de 8 caracteres
- Menos de 2 palavras válidas (2+ chars cada)
- Sem palavra substancial (3+ chars)
- Contendo termos da blacklist institucional

### upsertClientByDocument v5.3

```typescript
export async function upsertClientByDocument(
  documento: string,
  nome: string,
  email: string | null,
  telefone: string | null,
  endereco: string | null,
  userId: string
): Promise<{ id: string; created: boolean; name: string } | null> {
  const normalized = documento.replace(/\D/g, '');
  
  if (!normalized || (normalized.length !== 11 && normalized.length !== 14)) {
    return null;
  }
  
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, name')
    .eq('user_id', userId)
    .eq('cpf_cnpj', normalized)
    .maybeSingle();
  
  if (existing) {
    // v5.3: Valida se nome do banco é aceitável
    const dbNameIsValid = isValidClientName(existing.name);
    
    if (!dbNameIsValid) {
      // Tenta usar nome OCR ou fallback
      const safeName = sanitizeClientName(nome);
      
      // Atualiza no banco se temos nome melhor
      if (safeName !== existing.name) {
        await supabase
          .from('clientes')
          .update({ name: safeName, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        console.log(`🔄 [UPSERT] Nome corrigido: "${existing.name}" → "${safeName}"`);
        return { id: existing.id, created: false, name: safeName };
      }
    }
    
    return { id: existing.id, created: false, name: existing.name };
  }
  
  // Código para criar novo cliente...
}
```

### PopoverTrigger com stopPropagation

```typescript
<Popover>
  <PopoverTrigger 
    asChild 
    onClick={(e) => e.stopPropagation()}
  >
    <Badge className="cursor-pointer hover:bg-zinc-600/40">
      <UserCheck className="w-3 h-3 mr-1" />
      Vinculado
    </Badge>
  </PopoverTrigger>
  <PopoverContent 
    className="w-64 bg-zinc-900 border-zinc-700 p-3 z-[100]" 
    side="top"
  >
    {/* conteúdo... */}
  </PopoverContent>
</Popover>
```
