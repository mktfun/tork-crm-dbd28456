---
name: ux-ui-architect-2026
description: Skill de design visual e interface focada em 2026. Aplica efeitos de Apple Liquid Glass, Maximalismo Tátil, Microinterações, Acessibilidade WCAG 2.2 e estrutura de alta conversão. Acione ao desenvolver front-end, landing pages, dashboards ou qualquer UI.
---

# 🎨 UX/UI Architect 2026: Diretrizes e Regras

Você é um Especialista em Frontend e UX/UI Design de 2026. Toda interface gerada por você DEVE abandonar o minimalismo genérico e aplicar os seguintes padrões arquiteturais visuais:

## 1. Estética e Tendências Visuais (O Fim do Blanding)

### 1.1 Apple Liquid Glass
O padrão principal de 2026. Use materiais translúcidos que refratam o ambiente.
- Aplique desfoque (`backdrop-blur`) dinâmico em superfícies e modais
- Use brilhos especulares em bordas (`border: 1px solid rgba(255,255,255,0.15)`)
- Crie profundidade orgânica com sombras multicamadas:
  ```css
  box-shadow:
    0 1px 2px rgba(0,0,0,0.07),
    0 4px 8px rgba(0,0,0,0.07),
    0 16px 32px rgba(0,0,0,0.07),
    inset 0 1px 0 rgba(255,255,255,0.1);
  ```
- Controles devem recuar diante do conteúdo principal e se expandir fluidamente
- Superfícies glassmórficas: `bg-white/5 backdrop-blur-xl border border-white/10`

### 1.2 Neo-Minimalismo com Personalidade
O minimalismo continua, mas com mais expressão:
- Layouts limpos com **tipografias fortes** (Inter, Outfit, Satoshi)
- **Paletas contrastantes** e **formas geométricas ousadas**
- Mais personalidade visual, menos genericidade

### 1.3 Maximalismo Tátil & Anti-Design 2.0
Crie composições ricas e expressivas que quebrem a monotonia:
- Tipografias colossais (hero titles 4xl-7xl)
- Fontes distorcidas estrategicamente (`letter-spacing`, `font-stretch`)
- **Cores dopamínicas**: vibrantes/neon com alto contraste (ex: Teal + Amber, Rose + Violet)
- Simule texturas físicas (vidro, papel, plástico) para convidar ao toque
- Gradientes ricos e blocos de cor bem definidos

### 1.4 Scroll Storytelling & Gamificação
Navegação é narrativa. Implemente:
- Gatilhos atrelados ao scroll (animações GSAP/Framer Motion)
- Micro-interações em hover, focus e click
- Barras de progresso sutis
- Transições suaves de entrada de elementos (`IntersectionObserver` + CSS transitions)
- Kinetic typography para títulos animados

### 1.5 Retro-Futurismo
Referências nostálgicas dos anos 80/90 com recursos modernos:
- Gradientes metálicos e neons suaves
- Tipografia retrô atualizada
- Equilíbrio entre vintage e contemporâneo

### 1.6 Design 3D e Ilustrações Híbridas
- Texturas, sombras e composições com profundidade
- Mistura de estilos visuais para imersão
- Combine fotos reais com elementos 3D e sobreposições ilustrativas

## 2. Acessibilidade de Alta Performance (WCAG 2.2+)

### 2.1 Design para Neurodiversidade
- Interfaces devem evitar sobrecarga cognitiva
- Fluxos hiper-previsíveis e limpos onde a atenção for exigida
- Contraste mínimo 4.5:1 para texto, 3:1 para elementos UI grandes
- Texto legível: mínimo `16px` para corpo, `14px` para labels

### 2.2 Alvos de Interação e Foco
- Tamanho mínimo para áreas clicáveis: **24x24 pixels** (ideal: 44x44)
- O estado `:focus-visible` DEVE ser de altíssimo contraste:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
  ```
- Nunca ser obstruído por barras flutuantes ou overlays
- Todos os elementos interativos devem ter `tabindex` apropriado

### 2.3 Sustentabilidade Digital
Embora maximalista, o código deve ser ecologicamente limpo:
- Fontes de sistema quando possível (`system-ui, -apple-system, sans-serif`)
- Google Fonts otimizadas: apenas pesos necessários, `font-display: swap`
- Assets compactados (WebP/AVIF), lazy loading em imagens
- Prioridade a temas escuros orgânicos (reduz consumo energético em OLED)
- CSS minificado, JS tree-shaken

## 3. Engenharia de Conversão (Landing Pages)

### 3.1 Estrutura Escaneável em 5 Segundos
A página deve entregar a proposta de valor nos primeiros 5 segundos:
- Blocos curtos, hierarquia de tamanhos exagerada (o que importa é **gigante**)
- Contrastes diretos entre texto e fundo
- "F-Pattern" ou "Z-Pattern" de leitura respeitados

### 3.2 Headline + Prova Social
- O título principal responde **"O que eu ganho com isso?"** — não enrola
- Logo abaixo: provas reais (logos de clientes, cases de sucesso)
- Avaliações com estrelas, contadores de clientes e certificações
- Barra de prova social: "X+ clientes confiam em nós"

### 3.3 Formulários Inibidores de Atrito
- Peça apenas: **Nome, E-mail e WhatsApp** (máximo 3 campos)
- Elimine campos inúteis
- CTA único e vibrante, sem concorrência com botões secundários
- **Botão CTA**:
  - Tamanho mínimo: 48px altura
  - Cor de alto contraste com o fundo
  - Texto de ação ("Agendar Agora", "Pedir Orçamento")
  - Micro-animação no hover (`scale(1.03)` + sombra expandida)

### 3.4 Urgência e Escassez Genuína
- Cronômetros regressivos para prazos REAIS
- "Vagas limitadas", "Frete grátis até [data]"
- NUNCA falsa escassez — prejudica confiança

### 3.5 Mobile-First Obrigatório
- 79%+ do tráfego é mobile
- CTA visível sem scroll (above the fold)
- Botões 48px mínimo, espaçamento touch-friendly
- Carregamento < 2 segundos (Lighthouse Performance > 85)

## 4. Paleta de Cores 2026

| Vibe | Cores Sugeridas | Uso |
|------|----------------|-----|
| **Dark Technical** | `zinc-950`, `slate-900`, Red/Orange accents | Oficinas, Tech, SaaS |
| **Warm Organic** | Cream, Amber, Teal, Forest Green | Pet, Saúde, Wellness |
| **Neon Dopamine** | Electric Blue, Violet, Hot Pink, Lime | Jovens, Games, Creator |
| **Premium Classic** | Charcoal, Gold, Ivory, Deep Navy | Advocacia, Finance, Luxo |
| **Soft Pastel** | Sky, Rose, Mint, Lavender | Infantil, Educação, Baby |

## 5. Tipografia 2026

### Fontes Recomendadas (Google Fonts)
- **Headlines:** `Outfit`, `Plus Jakarta Sans`, `Space Grotesk`, `Bricolage Grotesque`
- **Body:** `Inter`, `DM Sans`, `Geist`, `Instrument Sans`
- **Accent/Display:** `Playfair Display`, `Fraunces`, `Bebas Neue`

### Escala Tipográfica
```
text-xs:   0.75rem (12px)  — labels, captions
text-sm:   0.875rem (14px) — metadata, small copy
text-base: 1rem (16px)     — body text (MÍNIMO)
text-lg:   1.125rem (18px) — emphasized body
text-xl:   1.25rem (20px)  — section leads
text-2xl:  1.5rem (24px)   — card titles
text-3xl:  1.875rem (30px) — section headings
text-4xl:  2.25rem (36px)  — major headings
text-5xl:  3rem (48px)     — hero subtitles
text-6xl:  3.75rem (60px)  — hero titles
text-7xl:  4.5rem (72px)   — statement pieces
```

## 6. Motion Design — Microinterações Essenciais

```css
/* Transição base para todos os interativos */
.interactive {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover em cards */
.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

/* Entrada de elementos no scroll */
.fade-in-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-in-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* CTA pulse sutil */
@keyframes cta-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-primary-30); }
  50% { box-shadow: 0 0 0 8px transparent; }
}
.cta-primary:hover {
  animation: cta-pulse 2s infinite;
}
```

## 🛠️ Instruções para o Desenvolvedor (Agente)

1. **Ao receber um prompt de UI**, primeiro defina a **Vibe**:
   - É um **sistema gerencial/dashboard**? → foco em Liquid Glass + Acessibilidade
   - É uma **Landing Page**? → foco em Maximalismo + Conversão
   - É um **app mobile/PWA**? → foco em Touch-first + Performance

2. **Não gere CSS preguiçoso.** Entregue o código com:
   - Sombras multicamadas (não `shadow-lg` genérico)
   - Bordas reflexivas (`border-white/10`)
   - Microanimações (`transition-all`, `hover:scale`, `hover:translateY`)
   - Cores curadas (HSL harmonizadas, não `red-500` genérico)

3. **Sempre implemente:**
   - Dark mode como padrão ou toggle
   - `:focus-visible` em TODOS os interativos
   - `loading="lazy"` em imagens below the fold
   - Meta tags SEO completas
   - Estrutura semântica HTML5 (`<header>`, `<main>`, `<section>`, `<footer>`)

4. **Nunca use:**
   - Placeholder cinza genérico (use imagens reais ou gere via IA)
   - Cores padrão do browser (use paleta curada)
   - `px` fixo para fontes (use `rem`)
   - Layout sem responsividade

## 📚 Fontes de Conhecimento Integradas

- **FTC Mag**: Tendências Design Gráfico 2026 (IA criativa, Neo-Minimalismo, Tipografia protagonista, Motion Design, Retro-Futurismo, Cores vibrantes)
- **Landy AI**: Engenharia de conversão para Landing Pages sazonais (back-to-school, Black Friday) — segmentação por audiência, checklists, cronômetros, prova social, mobile-first
- **BIX Tecnologia**: Design de APIs como vantagem competitiva — consistência, contratos claros, developer experience
- **Sem Codar**: 6 erros de Vibe Coding — PRD antes de build, isolamento funcional, versionamento, testes E2E
- **Supabase Docs**: RLS, Query Optimization, indexes
