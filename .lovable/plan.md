
# Plano de Correções e Melhorias - Amorim AI

## Resumo Executivo

Este plano aborda 6 problemas identificados nos testes do Assistente Tork, organizados em 4 frentes de trabalho:
1. Eliminacao de loader duplicado e implementacao de progresso real de tools
2. Melhoria de layout responsivo e interatividade dos cards
3. Paginacao inteligente para listas de apolices
4. Regra de grounding absoluto para eliminar dados inventados

---

## Problema 1: Loader Duplicado vs. Progresso da Tool

### Situacao Atual
- O frontend ja possui o componente `ToolExecutionStatus` funcional
- O backend ja emite eventos `tool_call` e `tool_result` via SSE
- O hook `useAIConversations` ja processa esses eventos e atualiza o estado `toolExecutions`
- Problema: O loader "Pensando..." generico aparece JUNTO com o status da tool

### Solucao
Modificar a logica de renderizacao para que, quando existirem `toolExecutions` ativas, o loader generico seja substituido pelo `ToolExecutionStatus`.

### Arquivos a Modificar
- `src/components/ai/AmorimAIFloating.tsx`

### Mudancas Especificas
1. Renderizar `ToolExecutionStatus` DENTRO do balao de mensagem loading quando houver tools em execucao
2. Manter o texto "Pensando..." apenas quando NAO houver tools ativas

---

## Problemas 2, 4 e 5: Layout Responsivo e Interatividade

### Situacao Atual
- `FinancialCard`: Grid fixo de 3 colunas que espreme em telas pequenas
- `PolicyListCard`: Nao e clicavel, texto pode vazar do container
- Cards nao possuem navegacao para detalhes

### Solucao

#### 2a. FinancialCard Responsivo
- Alterar grid de `grid-cols-3` para `grid-cols-1 sm:grid-cols-3`

#### 2b. PolicyListCard Interativo e Contido
- Envolver cada card com `Link` para `/dashboard/policies/{id}`
- Adicionar classes `truncate` e `min-w-0` para conter texto
- Garantir que o backend retorne o `id` da apolice (ja esta retornando)

#### 2c. ClientListCard Interativo
- Envolver cada card com `Link` para `/dashboard/clients/{id}`
- Aplicar mesmas classes de truncamento

### Arquivos a Modificar
- `src/components/ai/responses/FinancialCard.tsx`
- `src/components/ai/responses/PolicyListCard.tsx`
- `src/components/ai/responses/ClientListCard.tsx`

---

## Problema 3: Paginacao de Apolices

### Situacao Atual
- Backend ja retorna `total_count` e `returned_count` nas tools de apolices
- Frontend exibe apenas "Mostrando 10 de X apolices" estaticamente
- Nao existe interacao para carregar mais

### Solucao

#### 3a. System Prompt - Nova Regra de Proatividade
Adicionar regra ao prompt para que a IA SEMPRE informe sobre paginacao quando `total_count > returned_count`.

#### 3b. Frontend - Exibir Informacao de Paginacao
Modificar `PolicyListCard` para renderizar um aviso visual mais claro sobre a paginacao, incentivando o usuario a pedir "mais resultados".

### Arquivos a Modificar
- `supabase/functions/ai-assistant/index.ts` (System Prompt)
- `src/components/ai/responses/PolicyListCard.tsx`

---

## Problema 6: IA Inventando Dados de Clientes

### Situacao Atual
- A IA alucina emails e telefones ficticios quando os dados reais estao vazios
- Ja existe uma regra de "NUNCA invente dados" no prompt, mas nao e suficiente

### Solucao
Adicionar uma regra de GROUNDING ABSOLUTO com prioridade MAXIMA no System Prompt, explicitando que campos nulos devem ser OMITIDOS e NUNCA preenchidos com dados ficticios.

### Arquivos a Modificar
- `supabase/functions/ai-assistant/index.ts` (System Prompt)

---

## Detalhamento Tecnico

### 1. AmorimAIFloating.tsx - Loader Inteligente

Localizar o trecho de renderizacao do loading (linhas 479-484) e modificar:

```tsx
// ANTES
{message.isLoading ? (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-sm">Pensando...</span>
  </div>
) : (
  <AIResponseRenderer content={message.content} />
)}

// DEPOIS
{message.isLoading ? (
  toolExecutions.length > 0 ? (
    <ToolExecutionStatus executions={toolExecutions} />
  ) : (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Pensando...</span>
    </div>
  )
) : (
  <AIResponseRenderer content={message.content} />
)}
```

### 2. FinancialCard.tsx - Grid Responsivo

Linha 63: Alterar de `grid-cols-3` para responsivo:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

### 3. PolicyListCard.tsx - Links e Truncamento

Envolver o `GlassCard` com `Link`:
```tsx
import { Link } from 'react-router-dom';

// No mapeamento de policies:
<Link 
  to={policy.id ? `/dashboard/policies/${policy.id}` : '#'}
  className="block hover:ring-1 hover:ring-primary/50 rounded-xl transition-all"
>
  <GlassCard className="p-3">
    {/* conteudo existente com classes truncate */}
  </GlassCard>
</Link>
```

### 4. ClientListCard.tsx - Links e Truncamento

Mesmo padrao do PolicyListCard:
```tsx
<Link 
  to={client.id ? `/dashboard/clients/${client.id}` : '#'}
  className="block hover:ring-1 hover:ring-primary/50 rounded-xl transition-all"
>
  <GlassCard className="p-3">
    {/* conteudo existente */}
  </GlassCard>
</Link>
```

### 5. System Prompt - Novas Regras

Adicionar duas novas regras ao `BASE_SYSTEM_PROMPT`:

```xml
<rule priority="4">
  **PAGINACAO:** Ao usar ferramentas que retornam listas (apolices, clientes), 
  se o total_count for maior que o numero de itens retornados, SEMPRE informe 
  ao usuario: "Mostrando X de Y. Quer ver os proximos?" Isso permite que o 
  usuario solicite mais dados.
</rule>

<rule priority="5">
  **GROUNDING ABSOLUTO:** Ao exibir dados de uma ferramenta, voce esta 
  ESTRITAMENTE PROIBIDO de inventar, adicionar ou inferir qualquer informacao 
  que NAO esteja EXATAMENTE como foi retornada. Se um campo for nulo ou vazio 
  (ex: email: null), voce DEVE omiti-lo na resposta. NUNCA preencha campos 
  vazios com dados ficticios como "joao.silva@example.com" ou "(11) 99999-9999".
</rule>
```

---

## Ordem de Implementacao

1. **System Prompt** (Problemas 3 e 6) - Critico para comportamento da IA
2. **FinancialCard** (Problema 2) - Correcao simples de CSS
3. **PolicyListCard** (Problemas 4 e 5) - Links e truncamento
4. **ClientListCard** (Problema 4) - Links e truncamento
5. **AmorimAIFloating** (Problema 1) - Loader inteligente

---

## Validacao Pos-Implementacao

1. **Loader de Tool:** Perguntar "Quais apolices vencem este mes?" e verificar se aparece o status da ferramenta (ex: "Buscar Apolices > Consultando carteira...")
2. **FinancialCard:** Redimensionar a janela do chat e verificar se os cards empilham em telas pequenas
3. **PolicyListCard:** Clicar em uma apolice e verificar se navega para a pagina de detalhes
4. **Paginacao:** Perguntar "Liste todas as apolices" e verificar se a IA oferece ver mais
5. **Grounding:** Buscar um cliente sem email e verificar se a IA NAO inventa um email ficticio

---

## Arquivos Afetados

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| `supabase/functions/ai-assistant/index.ts` | Adicionar 2 regras ao prompt |
| `src/components/ai/AmorimAIFloating.tsx` | Logica de loader condicional |
| `src/components/ai/responses/FinancialCard.tsx` | Grid responsivo |
| `src/components/ai/responses/PolicyListCard.tsx` | Links + truncamento |
| `src/components/ai/responses/ClientListCard.tsx` | Links + truncamento |
