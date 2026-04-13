# Design Document: Marketing Ads Dashboard

## 1. Arquitetura de Dados (Integrations)

### 1.1 Persistência de Tokens
Usaremos a tabela `brokerage_integrations` (ou criaremos `marketing_configs`) para salvar:
- `meta_access_token` (Long-lived)
- `meta_ad_account_id`
- `rd_station_client_id` / `secret` / `refresh_token`
- `last_sync_at`

### 1.2 Camada de Sync (Edge Functions)
Criaremos a function `sync-marketing-data`:
- **Fetch Meta:** Chama `/insights` agregando por `level`.
- **Fetch RD:** Busca conversões do período via `/platform/events` ou contatos via `/platform/contacts`.
- **Merge:** Calcula `Spend (Meta) / Leads (RD) = CPL`.

## 2. Interface de Usuário (Apple-Level UI)

### 2.1 Layout Bento Grid
O dashboard será composto por widgets de tamanhos variados (`col-span-1` até `col-span-3`):
- **Hero Card (2x2):** ROAS Global com gráfico de área vibrante.
- **Medium Tiles (1x2):** Custo Total, Total de Leads, CTR Médio.
- **Small Tiles (1x1):** CPM, CPC, Cliques Únicos.
- **Bottom Shelf (Full Width):** Tabela de Campanhas com mini-charts (sparklines) em cada linha.

### 2.2 Materiais e Efeitos (Liquid Glass)
- **Fundo:** `bg-white/5 dark:bg-black/5` com `backdrop-blur-3xl`.
- **Bordas:** `border-white/10 dark:border-white/5` com gradiente sutil.
- **Hover:** `shimmer` effect usando `framer-motion` (um feixe de luz que percorre o card).
- **Cores de Acento:** Usar o azul Apple (`#007AFF`) e o verde Apple (`#34C759`) com glow.

## 3. Recursos Especiais

### 3.1 Immersive TV Mode
- Uma rota dedicada: `/dashboard/marketing/tv`.
- Oculta menus e barras de navegação do CRM.
- Transições automáticas a cada 15 segundos entre:
    1. Resumo Semanal (KPIs Grandes).
    2. Gráfico de Tendência (Fluxo de Leads).
    3. Top 3 Campanhas Mais Rentáveis.
- Ativa animação de partículas em movimento lento no background.

### 3.2 Premium PDF Engine
- Utilizaremos `html2canvas` + `jspdf` com um template específico de alta resolução.
- O PDF terá margens generosas, tipografia San Francisco e um layout de "Executive Summary".

## 4. Estrutura de Pastas Sugerida
- `src/pages/marketing/MarketingDashboard.tsx`
- `src/components/marketing/BentoGrid.tsx`
- `src/components/marketing/MarketingKpiCard.tsx`
- `src/components/marketing/TVModeWrapper.tsx`
- `src/services/metaAdsService.ts`
- `src/services/rdStationService.ts`
