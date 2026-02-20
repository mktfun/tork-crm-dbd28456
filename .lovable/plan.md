

# Plano: Inbox do Portal (CRM Administrativo) + Fix Build Error

## Parte 1: Corrigir Build Error em `settings.ts`

O arquivo `src/utils/settings.ts` faz queries na tabela `integration_settings` que nao existe nos tipos do Supabase. A correcao e simples: usar `as any` nos acessos ao supabase client para contornar a tipagem estrita.

**Arquivo:** `src/utils/settings.ts`
- Linha 31: cast `.from('integration_settings' as any)`
- Linha 74: mesmo cast

---

## Parte 2: Nova Pagina "Inbox do Portal"

### 2.1 Estrutura de Arquivos

| Arquivo | Descricao |
|---|---|
| `src/pages/PortalInbox.tsx` | Pagina principal com filtros e lista |
| `src/components/portal-inbox/RequestsList.tsx` | Lista/tabela de solicitacoes |
| `src/components/portal-inbox/RequestsFilters.tsx` | Filtros por status e busca |
| `src/components/portal-inbox/RequestDetailsSheet.tsx` | Sheet lateral com detalhes do QAR |

### 2.2 Rota e Navegacao

**`App.tsx`**: Adicionar rota `<Route path="solicitacoes-portal" element={<PortalInbox />} />` dentro do bloco `/dashboard`.

**`GlassSidebar.tsx`**: Adicionar item no grupo "Comercial":
```
{ id: 'portal-inbox', name: 'Inbox Portal', icon: Inbox, path: '/dashboard/solicitacoes-portal' }
```

### 2.3 Pagina Principal (`PortalInbox.tsx`)

- Header com titulo "Solicitacoes do Portal"
- `RequestsFilters`: Tabs rapidos (Todos / Pendentes / Em Atendimento / Concluidos) + campo de busca por nome do cliente
- `RequestsList`: Cards ou lista com dados vindos de `portal_requests` com join em `clientes(name, phone, email)`
- Clicar num item abre `RequestDetailsSheet`

### 2.4 Query Supabase

```typescript
supabase
  .from('portal_requests')
  .select('*, clientes(name, phone, email)')
  .eq('brokerage_user_id', userId)
  .order('created_at', { ascending: false })
```

Filtro de status aplicado via `.eq('status', filterValue)` quando nao for "todos".

### 2.5 Sheet de Detalhes (`RequestDetailsSheet`)

- **Header**: Nome do cliente, badges de tipo e ramo, dropdown de status
- **Corpo**: Renderizacao do campo `qar_report` (texto formatado com whitespace pre-wrap), botao colapsavel para ver `custom_fields` em JSON
- **Footer com 3 acoes**:
  - "Criar Oportunidade" (primario) -- placeholder por enquanto, mostra toast
  - "Vincular Existente" (secundario) -- placeholder visual
  - "Concluir e Arquivar" -- muda status para `concluido`

### 2.6 Atualizacao de Status

Ao alterar o status no dropdown do Sheet, faz update direto:
```typescript
supabase
  .from('portal_requests')
  .update({ status: newStatus })
  .eq('id', requestId)
```

---

## Parte 3: Detalhes Tecnicos

### Componentes utilizados
- `Sheet`, `SheetContent`, `SheetHeader` do shadcn
- `Badge` para status e tipo
- `Select` para dropdown de status
- `Input` para busca
- `Tabs` ou botoes para filtros rapidos
- `ScrollArea` para o corpo do QAR
- `Collapsible` para dados brutos JSON

### Estilo visual
- Modo escuro consistente com o resto do CRM
- Cards com `bg-card/80 border-border/50`
- Badges coloridos: Pendente (amber), Em Atendimento (blue), Concluido (emerald)

### Ordem de execucao
1. Fix build error em `settings.ts`
2. Criar componentes do inbox (`RequestsFilters`, `RequestsList`, `RequestDetailsSheet`)
3. Criar pagina `PortalInbox.tsx`
4. Registrar rota em `App.tsx`
5. Adicionar item no menu em `GlassSidebar.tsx`

