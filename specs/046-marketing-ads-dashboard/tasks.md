# Checklist de Tarefas: 046 Marketing & Ads Dashboard

## Fase 1: Fundação e Integrações (Backend)
- [ ] Criar migração SQL para a tabela `marketing_configs` e `marketing_daily_insights` (cache de métricas).
- [ ] Desenvolver Edge Function `sync-marketing-data` para conectar com Meta Graph API.
- [ ] Implementar conector do RD Station Marketing (Auth e Busca de Leads).
- [ ] Criar lógica de consolidação (CPL, ROAS) no banco de dados.

## Fase 2: Core UI (Liquid Glass Frontend)
- [ ] Criar a rota `/dashboard/marketing` em `App.tsx`.
- [ ] Desenvolver o componente `BentoGrid.tsx` com suporte a widgets dinâmicos.
- [ ] Criar `MarketingKpiCard.tsx` com efeito de vidro e shimmer.
- [ ] Implementar barra de filtros (Campanha, AdSet, Período).
- [ ] Renderizar gráficos Apple-Style usando `recharts` ou `framer-motion`.

## Fase 3: Recursos Imersivos e Exportação
- [ ] Desenvolver o `TVModeWrapper.tsx` com lógica de auto-play.
- [ ] Adicionar animação de partículas no background do modo TV.
- [ ] Configurar exportação de PDF usando `html2canvas` preservando o estilo "Liquid Glass".
- [ ] Adicionar tela de configuração das API Keys (Meta & RD).

## Fase 4: Polimento Apple 2026
- [ ] Aplicar tipografia SF Pro / San Francisco dinamicamente.
- [ ] Ajustar contrastes e blurs para Dark/Light mode de alto nível.
- [ ] Adicionar micro-interações (haptics visuais) ao clicar nos KPIs.
- [ ] Comitar todas as alterações sob `feat(marketing): high-end ads dashboard with meta and rd station integration`.
