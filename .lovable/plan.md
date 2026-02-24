

# UI/UX Premium Swap: TripGlide + Neobank Design System

## Overview
Complete visual redesign of the Portal do Segurado to match the TripGlide (travel app) and Neobank (financial app) reference designs. This is a **presentation-layer-only** refactoring — zero logic changes.

## Design Pillars
- **Font**: Instrument Sans (replacing Inter)
- **Palette**: Ice background (#f5f6f7), Pure white cards (#ffffff), Night interactive elements (#212529)
- **No hard borders**: Depth via `shadow-sm` and bg contrast only
- **Spring physics**: Framer Motion on all interactive elements
- **rounded-3xl** (24px) for main containers, **rounded-full** for pills/buttons

---

## File-by-File Changes

### 1. `src/index.css` — Design Tokens & Font

- Import Instrument Sans instead of Inter
- Update `:root` (light theme) CSS variables:
  - `--background`: map to #f5f6f7 (245 246 247 in HSL approximation)
  - `--card`: pure white #ffffff (0 0% 100%)
  - `--muted`: #e8e9ea equivalent
  - `--border`: very subtle, near-invisible
- Update `body` font-family to `'Instrument Sans', system-ui, sans-serif`
- Add `.no-scrollbar` utility for horizontal scroll containers

### 2. `src/layouts/PortalLayout.tsx` — Header & Bottom Nav

**Header** (currently has border-b, logo+greeting+toggle+logout):
- Remove `border-b border-border`
- Restructure to TripGlide pattern: greeting left (two lines: "Ola, Name" + "Bem-vindo ao portal"), avatar/profile button right
- Keep theme toggle and logout as icon buttons on right side
- Use `tracking-tight` on greeting text

**Bottom Nav** (currently light bg with colored pill):
- Invert to dark pill nav: `bg-foreground` (dark bar)
- Active item: white translucent pill (`bg-white/20`), text `text-white`
- Inactive items: `text-white/50 hover:text-white/80`
- Keep existing Framer Motion `layoutId` pill animation and `renderNavItem` pattern
- Keep conditional visibility for Seguros/Carteiras based on `portalConfig`

**Main content area**: Keep `px-3 py-4 sm:px-6 max-w-lg mx-auto pb-28`

### 3. `src/pages/portal/PortalHome.tsx` — Bento to TripGlide

**Welcome row**: Remove (greeting now lives in Layout header)

**Horizontal action pills** (replacing bento grid):
- Section title: "O que voce precisa solicitar?"
- Horizontal scroll row with `overflow-x-auto no-scrollbar`
- 3 pills: "Nova Cotacao" (dark/filled: `bg-foreground text-background rounded-full`), "Endosso" (light: `bg-card rounded-full shadow-sm`), "Sinistro" (light)
- Each pill uses `motion.button` with `whileTap={{ scale: 0.96 }}`

**Hero Card** (replacing the col-span-2 cotacao button):
- Large card (320px height) with gradient overlay simulating the TripGlide "Rio de Janeiro" card
- Background gradient: `bg-gradient-to-br from-foreground/90 to-foreground`
- White text overlay: "Cobertura Completa" subtitle, "Proteger seu Bem" title
- Floating action pill at bottom: "Fazer cotacao agora" with ChevronRight icon
- `rounded-3xl shadow-md`

**Quick Access row**: Remove (already available in bottom nav and pills)

**Seguros Ativos** (Neobank list style):
- Header row: "Apolices Ativas" left, "Ver todas" link right
- White container: `bg-card rounded-3xl shadow-sm`
- Items inside: flat rows with `border-b border-muted/50 last:border-0`, padding `p-5`
- Each row: icon in `bg-muted/50 rounded-xl` left, text center, badge + ChevronRight right
- Keep `getExpirationBadge` function intact

**Help section**: Keep flat, minimal styling

### 4. `src/pages/portal/PortalProfile.tsx` — Neobank Profile

- Remove Card/CardHeader/CardContent wrappers
- Add centered "Profile" title at top
- Large avatar circle (96-112px): `bg-foreground` with white User icon, centered
- "Personal info" section in white card (`bg-card rounded-3xl shadow-sm`):
  - Header row: "Personal info" title + "Edit" button
  - Each field as a flat row with icon, label (muted), value (bold) — separated by `border-b border-muted/50`
  - Fields: Nome (read-only), E-mail, Telefone, Endereco, Cidade/Estado, CEP
  - Editable fields use transparent bg inputs (`bg-transparent focus:outline-none`)
- "Account settings" secondary card below with "Alterar Senha" as a chevron row
- Keep all form logic, handleSave, formatPhone, formatCep, canEditProfile intact

### 5. `src/pages/portal/PortalWizard.tsx` — Ramo Selection

- Replace current `motion.button` grid with white rounded cards:
  - `bg-card rounded-3xl shadow-sm` per card
  - Icon in `bg-muted/50 rounded-xl` (no color tinting)
  - Label below in `text-foreground font-medium`
  - `whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}`
- Keep all wizard rendering logic, handleComplete, RAMOS array intact

### 6. `src/pages/portal/PortalPolicies.tsx` — Neobank List

- Wrap all policy items in a single white container: `bg-card rounded-3xl shadow-sm`
- Each policy row: flat layout with `border-b border-muted/50 last:border-0 p-5`
- Add `ChevronRight` to right side (already exists)
- Remove individual `Card`/`CardContent` per policy item
- Keep empty state, loading skeleton, PolicyDetailModal, and all data logic

### 7. `src/pages/portal/PortalCards.tsx` — Minimal Container

- Replace Card wrappers for empty state and info card with `bg-card rounded-3xl shadow-sm` divs
- Keep VirtualCard component rendering untouched

### 8. `src/pages/portal/PortalSolicitacoes.tsx` — Neobank List

- Wrap all request items in single white container: `bg-card rounded-3xl shadow-sm`
- Each request as flat row with `border-b border-muted/50 last:border-0 p-5`
- Remove individual Card/CardContent wrappers
- Keep status badges, date formatting, all data logic

### 9. `src/pages/portal/PortalLogin.tsx` — Minimal Touch-Up

- Update bottom-sheet bg to `bg-card` (pure white in light mode) instead of `bg-card/80`
- Ensure button uses `rounded-full` for the main CTA (TripGlide style)
- Keep all auth logic, password flow, 3-stage form intact

---

## What Will NOT Change
- No JS/TS logic modifications (hooks, state, sessionStorage, supabase calls)
- No RPC, SQL, or backend changes
- No route changes in App.tsx (except possibly defaultTheme if needed)
- PortalOnboarding.tsx — untouched (401 lines, gold gradients preserved)
- All 7+ Wizard internals (AutoWizard, ResidentialWizard, etc.) — untouched
- usePortalWizardSubmit, usePartialLead, usePortalPermissions — untouched
- getExpirationBadge, handleLogout, isActive, handleComplete — untouched

---

## Technical Details

### New CSS Variables (Light Theme)
```text
--background: 210 7% 96%      (~#f5f6f7)
--card: 0 0% 100%             (#ffffff)
--muted: 210 4% 91%           (~#e8e9ea)
--muted-foreground: 210 5% 46% (~#6c757d)
--foreground: 210 11% 15%     (~#212529)
--border: 210 4% 93%          (near-invisible)
```

### Framer Motion Constants
```text
springTransition = { type: 'spring', stiffness: 400, damping: 30 }
Applied to: nav pill, hero card hover, all tappable elements
```

### Import Changes Per File
- PortalHome: Add `ChevronRight` from lucide, keep `motion` from framer-motion
- PortalProfile: Remove Card/CardHeader/CardContent, add `motion`, `ChevronRight`
- PortalPolicies: Keep Card imports only for empty state, or replace with divs
- PortalSolicitacoes: Same pattern — remove Card wrappers for list items

