
# Plano: Correção do React Error #310 e Erros de Build

## Diagnóstico Completo

### Erro Principal: React Error #310

**Significado**: "Rendered fewer hooks than expected" — um hook foi chamado DEPOIS de um `return` condicional, violando a regra de hooks do React.

**Localização**: `src/layouts/PortalLayout.tsx` (linhas 83-100)

```text
Problema:
+--------------------------+
| if (isLoading) {         |
|   return <Loading />;    | ← RETORNA ANTES
| }                        |
+--------------------------+
            ↓
+--------------------------+
| useEffect(() => {...});  | ← HOOK DEPOIS DO RETURN = ERRO!
+--------------------------+
```

O segundo `useEffect` (linhas 96-100) é chamado APÓS o `return` condicional do loading, quebrando a regra de hooks.

### Erros de Build Secundários

| Arquivo | Problema |
|---------|----------|
| `ai-assistant/index.ts:158` | Markdown de exemplo dentro do template literal está sendo interpretado como código TypeScript |
| `useFinanceiro.ts:363` | Passa `p_user_id` mas a RPC `get_pending_totals` não aceita esse parâmetro |
| `useModularAI.ts:96` | Upsert com `config_id` no spread causa conflito de tipos |
| `useReconciliation.ts` | Múltiplas views/funções referenciadas não existem no schema de tipos |

---

## Solução

### 1. Corrigir `PortalLayout.tsx` (Prioridade Crítica)

Mover TODOS os hooks para ANTES de qualquer return condicional:

```typescript
// ANTES (Errado)
if (isLoading) return <Loading />;

useEffect(() => { ... }, []); // CRASH!

// DEPOIS (Correto)
useEffect(() => { ... }, []); // Hooks SEMPRE no topo

if (isLoading) return <Loading />;
```

### 2. Corrigir `ai-assistant/index.ts`

O template literal do system prompt contém blocos markdown que são interpretados como código. Escapar caracteres especiais:

```typescript
// Trocar
```markdown
## 📊 Análise...
```

// Para
\`\`\`markdown
## 📊 Análise...
\`\`\`
```

### 3. Corrigir `useFinanceiro.ts`

A função `get_pending_totals` aceita `p_start_date` e `p_end_date`, não `p_user_id`:

```typescript
// Antes
await supabase.rpc('get_pending_totals', {
  p_user_id: user.id // ERRO
});

// Depois
await supabase.rpc('get_pending_totals', {
  p_start_date: startDate,
  p_end_date: endDate
});
```

### 4. Corrigir `useModularAI.ts`

O upsert precisa separar o spread do `config_id`:

```typescript
// Antes
.upsert({ ...prompt, config_id: configId })

// Depois
.upsert([{ 
  ...prompt, 
  config_id: configId,
  content: prompt.content || '',
  module_type: prompt.module_type || 'custom'
}])
```

### 5. Corrigir `useReconciliation.ts`

Adicionar casts `as any` para views/funções que ainda não estão no schema de tipos:

```typescript
await supabase
  .from('reconciliation_dashboard' as any)
  .select('*');
```

Ou (melhor) sincronizar os tipos com o banco.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/layouts/PortalLayout.tsx` | Mover useEffect para antes do return condicional |
| `supabase/functions/ai-assistant/index.ts` | Escapar backticks no template literal |
| `src/hooks/useFinanceiro.ts` | Corrigir parâmetros da RPC |
| `src/hooks/useModularAI.ts` | Corrigir tipagem do upsert |
| `src/hooks/useReconciliation.ts` | Adicionar casts ou sincronizar tipos |

---

## Seção Técnica: Prevenção de Erros Futuros

### Padrão Seguro para Componentes com Loading

```typescript
export function SafeComponent() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  
  // TODOS os hooks PRIMEIRO - ordem garantida
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    if (!isLoading && !data) {
      navigate('/fallback');
    }
  }, [isLoading, data, navigate]);
  
  // Retornos condicionais DEPOIS dos hooks
  if (isLoading) return <Loading />;
  if (!data) return null;
  
  return <Content data={data} />;
}
```

### Validação de RPCs

Sempre verificar o schema de tipos antes de chamar uma RPC:

```typescript
// types.ts define os parâmetros aceitos
get_pending_totals: {
  Args: { p_start_date?: string; p_end_date?: string }
}
```

---

## Resultado Esperado

1. **Erro #310 eliminado**: Tela não mais trava no portal
2. **Build passa**: Todos os erros de TypeScript resolvidos
3. **Prevenção**: Padrão documentado para evitar reincidência
