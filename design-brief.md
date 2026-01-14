
# Design Brief - Sistema Liquid Glass

## Visão Geral
Este documento estabelece os padrões visuais e de experiência do usuário para a aplicação de gestão de seguros, baseado no sistema "Liquid Glass" - uma abordagem moderna que combina glassmorphism com funcionalidade empresarial.

## 1. Filosofia Visual

### Conceito Central: "Liquid Glass"
- **Transparência Inteligente**: Elementos semi-transparentes que mantêm legibilidade
- **Profundidade Sutil**: Uso de blur, sombras e bordas para criar hierarquia
- **Fluidez**: Transições suaves e animações que guiam o usuário
- **Profissionalismo**: Estética moderna mantendo seriedade empresarial

## 2. Paleta de Cores

### Cores Primárias (HSL)
```css
/* Background System */
--background: 222.2 84% 4.9%        /* Cinza escuro principal */
--foreground: 210 40% 98%           /* Texto principal branco */

/* Card System */
--card: 222.2 84% 4.9%             /* Background de cards */
--card-foreground: 210 40% 98%     /* Texto em cards */

/* Interactive Elements */
--primary: 210 40% 98%             /* Elementos primários */
--primary-foreground: 222.2 84% 4.9% /* Texto em primários */
--secondary: 217.2 32.6% 17.5%     /* Elementos secundários */
--muted: 217.2 32.6% 17.5%         /* Elementos diminuídos */
--muted-foreground: 215 20.2% 65.1% /* Texto secundário */

/* Status Colors */
--success: 142 76% 36%             /* Verde para sucesso */
--warning: 38 92% 50%              /* Amarelo para avisos */
--info: 199 89% 48%                /* Azul para informações */
--critical: 0 84% 60%              /* Vermelho para crítico */

/* Glass System (Valores RGBA) */
--glass-bg: rgba(255, 255, 255, 0.1)      /* Background glass padrão */
--glass-bg-dark: rgba(0, 0, 0, 0.2)       /* Background glass escuro */
--glass-border: rgba(255, 255, 255, 0.2)   /* Bordas glass */
--glass-border-dark: rgba(255, 255, 255, 0.1) /* Bordas glass escuras */
```

### Cores de Dados (Charts)
```css
--chart-1: 220 70% 50%    /* Azul principal */
--chart-2: 160 60% 45%    /* Verde */
--chart-3: 30 80% 55%     /* Laranja */
--chart-4: 280 65% 60%    /* Roxo */
--chart-5: 340 75% 55%    /* Rosa */
```

## 3. Tipografia

### Família de Fontes
- **Principal**: Inter (Google Fonts)
- **Fallback**: system-ui, sans-serif

### Hierarquia de Textos
```css
/* Títulos Principais */
.title-xl { font-size: 3rem; font-weight: 700; } /* 48px */
.title-lg { font-size: 2.25rem; font-weight: 600; } /* 36px */
.title-md { font-size: 1.875rem; font-weight: 600; } /* 30px */

/* Subtítulos */
.subtitle-lg { font-size: 1.5rem; font-weight: 600; } /* 24px */
.subtitle-md { font-size: 1.25rem; font-weight: 500; } /* 20px */
.subtitle-sm { font-size: 1.125rem; font-weight: 500; } /* 18px */

/* Corpo */
.body-lg { font-size: 1rem; font-weight: 400; } /* 16px */
.body-md { font-size: 0.875rem; font-weight: 400; } /* 14px */
.body-sm { font-size: 0.75rem; font-weight: 400; } /* 12px */

/* Labels e Captions */
.label-lg { font-size: 0.875rem; font-weight: 500; } /* 14px */
.label-md { font-size: 0.75rem; font-weight: 500; } /* 12px */
.caption { font-size: 0.625rem; font-weight: 400; } /* 10px */
```

## 4. Sistema Liquid Glass

### Componente Base: GlassCard
```css
.glass-component {
  background: rgba(40, 40, 60, 0.55);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  border-radius: 16px;
}
```

### Variações de Glass
1. **Glass Sutil** (cards de conteúdo)
   - `bg-white/5`
   - `backdrop-blur-sm`
   - `border-white/10`

2. **Glass Médio** (componentes interativos)
   - `bg-white/10`
   - `backdrop-blur-md`
   - `border-white/20`

3. **Glass Intenso** (elementos de destaque)
   - `bg-white/15`
   - `backdrop-blur-lg`
   - `border-white/30`

## 5. Componentes Padrão

### 5.1 KPI Cards
**Estrutura**: `KpiCard`
- **Background**: Glass sutil com hover intensificado
- **Padding**: 1.5rem (24px)
- **Border Radius**: 1rem (16px)
- **Sombra**: `shadow-lg`
- **Transição**: `hover:scale-105` com duração 200ms

**Estados**:
- Default: `border-slate-800 bg-slate-900`
- Warning: `border-yellow-500/50 bg-yellow-900/30`
- Danger: `border-red-500/60 bg-red-900/40`

### 5.2 Botões
**Variante Glass**: `variant="glass"`
```css
.btn-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  transition: all 0.2s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
```

### 5.3 Cards de Dados
**Estrutura**: `AppCard` com efeito glass
- **Mouse tracking**: Efeito de hover com gradiente radial
- **Animação**: Entrada suave com `animate-float-in`
- **Responsividade**: Adaptação automática em grid

## 6. Sistema de Layout

### Grid System
```css
/* KPIs Dashboard */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .kpi-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

### Espaçamento Padrão
- **Container**: padding 1.5rem (24px)
- **Elementos**: gap 1rem (16px)
- **Seções**: margin-bottom 2rem (32px)

## 7. Animações e Transições

### Animações de Entrada
```css
@keyframes float-in {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-float-in {
  animation: float-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Transições de Hover
- **Duração**: 200-300ms
- **Timing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Propriedades**: transform, background, box-shadow

### Efeitos de Glass
```css
.glass-component::before {
  content: '';
  position: absolute;
  top: var(--y, 50%);
  left: var(--x, 50%);
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.glass-component:hover::before {
  opacity: 1;
}
```

## 8. Iconografia

### Biblioteca: Lucide React
- **Tamanho padrão**: 16px (h-4 w-4)
- **Tamanho médio**: 20px (h-5 w-5)
- **Tamanho grande**: 24px (h-6 w-6)

### Cores de Ícones
- **Padrão**: `text-white/80`
- **Secundário**: `text-white/60`
- **Status**: Seguir cores do sistema (success, warning, critical)

## 9. Estados Interativos

### Hover States
- **Cards**: `hover:scale-105 hover:shadow-2xl`
- **Botões**: `hover:bg-white/20`
- **Links**: Sublinhado animado com `after:` pseudo-elemento

### Focus States
- **Ring**: `focus:ring-2 focus:ring-sky-500`
- **Offset**: `focus:ring-offset-2`

### Loading States
- **Skeleton**: `bg-gray-700 animate-pulse`
- **Spinner**: `animate-spin` com ícone `Loader2`

## 10. Responsividade

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large**: > 1280px

### Adaptações por Dispositivo
```css
/* Mobile First */
.responsive-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 1.5rem;
    padding: 2rem;
  }
}
```

## 11. Acessibilidade

### Contraste
- **Texto principal**: Mínimo 4.5:1
- **Texto secundário**: Mínimo 3:1
- **Elementos interativos**: Mínimo 3:1

### Navigation
- **Focus visible**: Sempre presente
- **Keyboard navigation**: Suportada em todos os componentes
- **Screen readers**: Labels adequados e semântica correta

## 12. Performance

### Otimizações
- **Backdrop-filter**: Usado com moderação
- **Animações**: GPU-accelerated com `transform` e `opacity`
- **Loading states**: Para melhor perceived performance

### Diretrizes de Implementação
1. **Minimize backdrop-filter** em elementos aninhados
2. **Use transform3d** para animações mais suaves
3. **Lazy load** componentes pesados
4. **Debounce** interações frequentes (hover tracking)

## 13. Componentes de Referência

### Implementados
- ✅ `GlassCard` - Componente base
- ✅ `KpiCard` - Cards de KPI
- ✅ `AppCard` - Cards com efeito glass
- ✅ `Button` variant="glass"
- ✅ `GlassMetricCard` - Cards de métricas com glass

### A Implementar
- 🔄 `GlassModal` - Modais com efeito glass
- 🔄 `GlassTable` - Tabelas com background glass
- 🔄 `GlassSidebar` - Sidebar com efeito premium
- 🔄 `GlassForm` - Formulários com estilo glass

## 14. Checklist de Qualidade

### Para Novos Componentes
- [ ] Usa variáveis CSS do sistema
- [ ] Implementa estados hover/focus
- [ ] Responsivo em todos os breakpoints
- [ ] Acessível (ARIA, keyboard navigation)
- [ ] Animações suaves (< 300ms)
- [ ] Glass effect apropriado
- [ ] Tipografia consistente
- [ ] Cores do sistema de design

### Para Reviews
- [ ] Consistência visual
- [ ] Performance acceptable
- [ ] Funciona em mobile
- [ ] Legibilidade mantida
- [ ] Efeitos glass não excessivos

---

**Última atualização**: 16/07/2025
**Versão**: 1.0
**Mantido por**: Equipe de Desenvolvimento

Este documento deve ser consultado para todos os novos desenvolvimentos e mantido atualizado conforme a evolução do sistema.
