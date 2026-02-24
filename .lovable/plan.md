

# Refatoracao: Cards, Bottom Sheet Arrastavel e Resolucao do UUID

## Problemas Identificados

### 1. UUID no lugar do tipo do seguro
A coluna `apolices.type` armazena um UUID (referencia para `ramos.id`), nao o nome legivel. Exemplo: em vez de "Auto", aparece `6b3187f9-7de8-4677-a916-1692bee60869`. Isso afeta tanto o VirtualCard quanto o PolicyDetailModal e a lista de apolices.

### 2. Bottom Sheet nao e arrastavel
O PolicyDetailModal usa `motion.div` manual para simular um bottom sheet, mas nao tem o comportamento de "segurar e arrastar pra baixo pra fechar" que voce descreveu. O projeto ja tem a biblioteca `vaul` instalada, que faz exatamente isso nativamente.

### 3. Carteirinha fora do design system
O VirtualCard ja tem o estilo "Black Card" mas esta mostrando o UUID no cabecalho.

---

## Solucao

### Arquivo 1: SQL Migration — Resolver UUID nos RPCs do portal

Alterar as funcoes `get_portal_cards_hybrid` e `get_portal_policies_hybrid` para fazer JOIN com a tabela `ramos` e retornar `r.nome` em vez do UUID raw de `a.type`.

```sql
-- get_portal_cards_hybrid: trocar a.type por COALESCE(r.nome, a.type) com LEFT JOIN ramos r ON r.id::text = a.type
-- get_portal_policies_hybrid: mesma mudanca
```

Isso resolve o UUID em ambas as telas (Seguros e Carteirinhas) sem mudar nenhum codigo frontend.

Tambem adicionar `carteirinha_url` ao retorno de `get_portal_cards_hybrid` (atualmente nao retorna esse campo, por isso as carteirinhas nao mostram botao de download de PDF).

### Arquivo 2: `src/components/portal/PolicyDetailModal.tsx` — Drawer arrastavel com Vaul

Substituir o Dialog/motion.div manual pelo componente `Drawer` do Vaul (`vaul`), que ja esta instalado no projeto. O Vaul oferece:
- Arrastar pra baixo pra fechar (com snap points)
- Comportamento elastico/"maleavel" nativo
- Drag pill funcional (nao so visual)
- Scroll interno sem conflito com o arraste

Estrutura:
```text
Drawer (vaul)
  DrawerOverlay (bg-black/60 backdrop-blur-md)
  DrawerContent (rounded-t-[32px], bg-background)
    DrawerHandle (pill nativo do vaul)
    Header (icone + titulo + numero)
    Body scrollavel (DetailRows: Segurado, Seguradora, Vigencia, Bem Segurado, CPF)
    Footer fixo (botao download se disponivel)
```

O comportamento de "arrastar ate embaixo pra fechar, soltar no meio e ele volta" e nativo do Vaul.

### Arquivo 3: `src/components/portal/VirtualCard.tsx` — Corrigir exibicao do tipo

O campo `policy.type` agora vira do SQL com o nome legivel (ex: "Auto" em vez do UUID). O codigo do cabecalho ja exibe `policy.type || 'Seguro'`, entao vai funcionar automaticamente apos a migracao SQL.

A funcao `getTypeIcon` tambem ja faz pattern matching por texto ("auto", "resid", etc.), entao vai funcionar corretamente com o nome do ramo.

Nenhuma mudanca de estilo necessaria — o design "Black Card" ja esta aplicado.

### Arquivo 4: `src/pages/portal/PortalPolicies.tsx` — Corrigir fallback do tipo

Onde aparece `policy.insured_asset || policy.type || 'Apolice'`, o `policy.type` agora sera o nome legivel. Tambem corrigir `getTypeIcon` que faz pattern matching no tipo (ja funciona com nomes legiveis).

---

## Resumo das mudancas

| Arquivo | O que muda |
|---------|-----------|
| SQL Migration | JOIN ramos nas 2 RPCs do portal + adicionar carteirinha_url na RPC de cards |
| PolicyDetailModal.tsx | Trocar Dialog+motion.div por Vaul Drawer (arrastavel nativo) |
| VirtualCard.tsx | Nenhuma mudanca de codigo (correcao vem do SQL) |
| PortalPolicies.tsx | Nenhuma mudanca de codigo (correcao vem do SQL) |

## Detalhes Tecnicos

### SQL: Resolucao do UUID para nome do ramo

```sql
-- Dentro de get_portal_cards_hybrid, trocar:
--   a.type
-- Por:
--   COALESCE(r.nome, a.type) AS type
-- E adicionar:
--   LEFT JOIN ramos r ON r.id::text = a.type
-- Tambem adicionar ao RETURNS TABLE:
--   carteirinha_url text
-- E ao SELECT:
--   a.carteirinha_url

-- Mesma logica para get_portal_policies_hybrid
```

### Vaul Drawer: Estrutura do componente

```typescript
import { Drawer } from 'vaul';

// Substituir Dialog por:
<Drawer.Root open={isOpen} onOpenChange={onClose}>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-[32px] bg-background">
      <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-4 mb-2" />
      {/* header + body + footer */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

O snap behavior do Vaul permite que o usuario arraste parcialmente e o sheet "volte" se nao arrastou o suficiente, ou feche se arrastou alem do threshold — exatamente o comportamento descrito.

