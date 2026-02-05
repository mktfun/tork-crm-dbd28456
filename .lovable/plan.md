
# Plano: Implementação Completa da Nova Landing Page

## Diagnóstico

O código nunca foi efetivamente salvo no projeto:
- **Diretório `src/components/landing/`**: Não existe
- **`src/pages/Landing.tsx`**: Ainda usa componentes antigos (`HeroGeometric`, `SocialProofSection`, etc.)

## Implementação

### Fase 1: Criar Estrutura de Componentes

Criar o diretório `src/components/landing/` com os seguintes componentes:

| Componente | Descrição |
|------------|-----------|
| `TorkLogo.tsx` | Logo SVG com gradiente |
| `SmartNavbar.tsx` | Navbar com efeito glass → pill no scroll |
| `SectionDivider.tsx` | Divisores visuais entre seções |
| `StickyScrollSection.tsx` | Simulação de WhatsApp com chat animado |
| `HeroMockups.tsx` | Mockup do dashboard no hero |
| `MegaFooter.tsx` | Footer premium com links e social |

### Fase 2: Substituir Landing Page

Substituir completamente `src/pages/Landing.tsx` com:
- Hero com animações fade-in
- Navbar transformável (glass → pill)
- Seção de simulação WhatsApp com scroll triggers
- Seção "Engine" com cards de features
- CTA final premium
- Footer

### Fase 3: Limpeza (Opcional)

Após confirmar que a nova landing funciona:
- Remover componentes antigos não utilizados de `src/components/ui/shape-landing-hero.tsx` (se não forem usados em outros lugares)

---

## Arquivos a Criar

```text
src/components/landing/
├── TorkLogo.tsx
├── SmartNavbar.tsx
├── SectionDivider.tsx
├── StickyScrollSection.tsx
├── HeroMockups.tsx
└── MegaFooter.tsx
```

## Arquivo a Substituir

```text
src/pages/Landing.tsx → Nova versão completa
```

---

## Detalhes Técnicos

### SmartNavbar.tsx
- Estado `scrolled` controlado por `window.scrollY > 50`
- Animação de largura: `92%` → `620px` (desktop)
- Efeito glass: `backdrop-blur(20px)` + `rgba(2,6,23,0.90)`
- Mobile: Menu overlay fullscreen

### StickyScrollSection.tsx
- `useScroll` do Framer Motion para tracking de scroll
- Array de mensagens reveladas progressivamente
- Indicador de "typing" em intervalos específicos
- iPhone mockup com Dynamic Island

### Landing.tsx
- Hook order correto (useAuth → useNavigate → useEffect)
- Loading state premium com logo Tork
- Redirect automático se autenticado
- 4 seções principais: Hero, WhatsApp Simulation, Engine, CTA

---

## Resultado Esperado

- Navbar com morphing suave ao scroll
- Hero minimalista com gradientes sutis
- **Simulação de chat WhatsApp que anima conforme scroll**
- Seção de automação com visualização causa→efeito
- CTA com texto gradiente e glow effect
- Footer organizado com status indicator
