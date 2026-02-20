

# Plano: Portal do Segurado Fase 1 -- Corrigir Build Errors + Novas Telas

## Problema Atual

Os wizards foram migrados de outro projeto (jjseguros) e importam modulos que nao existem neste projeto. Ha **~50 erros de build** que precisam ser resolvidos antes de qualquer feature nova.

---

## Parte 1: Corrigir Erros de Build dos Wizards

### 1.1 Criar componentes UI faltantes

Os wizards importam 5 componentes que nao existem. Precisamos criar shims compatíveis:

| Componente | Caminho | O que faz |
|---|---|---|
| `FormCard` | `src/components/ui/form-card.tsx` | Wrapper de card para seções do formulário (div com titulo + children) |
| `FormInput` | `src/components/ui/form-input.tsx` | Input com label integrado (wrapper do Input existente) |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx` | Toggle entre opcoes (tipo tabs inline) |
| `RadioCardGroup` | `src/components/ui/radio-card.tsx` | Cards clicáveis como radio buttons |
| `ToggleSwitch` | `src/components/ui/toggle-switch.tsx` | Switch com label (wrapper do Switch existente) |
| `LgpdConsent` | `src/components/ui/lgpd-consent.tsx` | Checkboxes de aceite LGPD (termos + privacidade) |

### 1.2 Corrigir export do Stepper

O stepper existente exporta `Stepper` com props `{ steps: string[], currentStep }`, mas os wizards importam `type Step` (objeto com `id`, `title`, `description`). Precisamos adicionar o export `Step` ao stepper.

### 1.3 Corrigir variantes de Button

Os wizards usam `variant="outline-subtle"` e `variant="cta"` que nao existem. Adicionar essas duas variantes ao `button.tsx`:
- `outline-subtle` -> estilo sutil de outline
- `cta` -> botao de acao principal (pode mapear para `silver` ou `default`)

### 1.4 Corrigir HealthWizard

- Criar stub `src/utils/metaPixel.ts` com funcoes no-op (`trackViewContent`, `trackLead`, `trackCompleteRegistration`)
- Mover os arquivos `HealthStep*.tsx` para a subpasta `health/` (os imports esperam `./health/HealthStep1Lives`)
- Corrigir query de `integration_settings` -- usar cast `as any` para contornar tipos do Supabase que nao tem essa tabela, ou substituir por fallback hardcoded

### 1.5 Criar stub `src/utils/dataProcessor.ts`

Os wizards importam `sendToRDStation` e builders (`buildAutoPayload`, `buildHealthPayload`, etc). No contexto do portal logado, estas funcoes devem ser **no-ops** (nao enviar para RD Station). Criar o arquivo com exports vazios que retornam sem fazer nada.

---

## Parte 2: Melhorias de Login/Onboarding (UX)

### 2.1 PortalLogin.tsx
- Adicionar mascara visual de CPF no input quando o usuario digita numeros (formatacao on-change)
- Sanitizar com `.replace(/\D/g, '')` antes de enviar ao RPC

### 2.2 PortalOnboarding.tsx
- Ja possui `formatCpf`, `formatPhone` e `validateCpf` com Modulo 11 -- revisar e garantir que a validacao bloqueia submit
- Adicionar mascara ao campo de telefone com formatacao em tempo real

---

## Parte 3: Novas Telas do Portal

### 3.1 Estender PortalHome.tsx
- Adicionar secao "Nova Solicitacao" com 3 botoes: Nova Cotacao, Solicitar Endosso, Avisar Sinistro
- Cada botao roteia para `/:slug/portal/wizard?type=cotacao|endosso|sinistro`

### 3.2 Estender PortalPolicies.tsx
- Para apolices com `expiration_date` <= 30 dias, exibir Badge/Botao "Renovar" que leva ao wizard de renovacao

### 3.3 Criar PortalSolicitacoes.tsx (Inbox)
- Lista read-only de `portal_requests` do cliente
- Visual: icone do ramo, data, tipo, status badge (Pendente=amarelo, Em Atendimento=azul, Concluido=verde)

### 3.4 Criar PortalWizard.tsx (Orquestrador)
- Recebe `?type=cotacao&ramo=auto` via query params
- Tela de selecao de ramo (Auto, Residencial, Vida, Empresarial, Viagem, Saude, Smartphone)
- Renderiza o wizard correto
- No `onComplete`, chama `usePortalWizardSubmit().submitToPortal(...)` e redireciona para o inbox

### 3.5 Registrar rotas no App.tsx
- `/:slug/portal/wizard` -> PortalWizard
- `/:slug/portal/solicitacoes` -> PortalSolicitacoes
- Adicionar link no menu/navegacao do PortalLayout

---

## Parte 4: Detalhes Tecnicos

### Arquivos a criar (novos)
1. `src/components/ui/form-card.tsx`
2. `src/components/ui/form-input.tsx`
3. `src/components/ui/segmented-control.tsx`
4. `src/components/ui/radio-card.tsx`
5. `src/components/ui/toggle-switch.tsx`
6. `src/components/ui/lgpd-consent.tsx`
7. `src/utils/metaPixel.ts` (stubs no-op)
8. `src/utils/dataProcessor.ts` (stubs no-op, se nao existir -- ja existe com funcoes parciais, verificar)
9. `src/components/portal/wizards/health/` (mover HealthStep*.tsx)
10. `src/pages/portal/PortalWizard.tsx`
11. `src/pages/portal/PortalSolicitacoes.tsx`

### Arquivos a editar
1. `src/components/ui/stepper.tsx` -- exportar `Step` type
2. `src/components/ui/button.tsx` -- adicionar variantes `cta` e `outline-subtle`
3. `src/pages/portal/PortalHome.tsx` -- secao Nova Solicitacao
4. `src/pages/portal/PortalPolicies.tsx` -- badge Renovar
5. `src/App.tsx` -- novas rotas
6. `src/components/portal/wizards/HealthWizard.tsx` -- corrigir imports e query de integration_settings

### Arquivos que NAO serao alterados
- `src/hooks/usePortalWizardSubmit.ts`
- `src/utils/qualification.ts`
- `src/utils/cnpjApi.ts`
- Logica interna dos wizards (loops, validacoes, steps)

---

## Ordem de execucao

1. Criar todos os componentes UI faltantes (form-card, form-input, etc)
2. Corrigir stepper e button (exports/variantes)
3. Criar stubs (metaPixel, dataProcessor se necessario)
4. Mover/corrigir HealthWizard e seus steps
5. Verificar build limpo
6. Criar PortalWizard e PortalSolicitacoes
7. Estender PortalHome e PortalPolicies
8. Registrar rotas

