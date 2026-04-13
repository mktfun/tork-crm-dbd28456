# Master Spec: 046 Marketing & Ads Dashboard (Apple-Level Visualization)

## 1. Visão Geral
Este documento define a criação do módulo de **Marketing & Tráfego Pago** do Tork CRM. O objetivo é construir um Dashboard de altíssimo nível visual (Padrão Apple "Liquid Glass 2026"), capaz de conectar APIs do **Meta Ads (Facebook/Instagram)** e **RD Station Marketing**, consolidando métricas de investimento, engajamento e conversão em uma interface imersiva e simples de entender.

## 2. Requisitos e Diferenciais
- **R1: Integração Meta Ads:** Puxar dados de Campanhas, Conjuntos de Anúncios e Anúncios individuais via Graph API.
- **R2: Integração RD Station:** Vincular leads gerados no RD com o gasto no Meta para calcular o CPL (Custo por Lead) real.
- **R3: Filtros Dinâmicos:** Filtragem profunda por Nível (Conta -> Campanha -> AdSet -> Ad) e Período Customizado.
- **R4: Apple-Level UI/UX:** Uso intensivo de Bento Grids, translucidez (blur), animações de partículas sutis e tipografia dinâmica (San Francisco).
- **R5: TV Mode (Slideshow):** Um modo de exibição imersivo para televisores que rotaciona os principais KPIs e gráficos automaticamente.
- **R6: Exportação Premium:** Geração de relatórios em PDF com design de revista/apresentação de alto padrão.

## 3. KPIs de Marketing (Métricas Chave)
O dashboard focará nos seguintes indicadores essenciais:
1. **ROAS (Return on Ad Spend):** O "Santo Graal" do tráfego pago.
2. **CPL (Custo por Lead):** Integrado com o RD Station.
3. **CTR (Click-Through Rate):** Eficiência do criativo.
4. **CPM / CPC:** Saúde técnica dos leilões.
5. **Conversões (Funil):** Impressões -> Cliques -> Leads (RD) -> Negócios (CRM).

## 4. User Stories
- **US1:** Como Gestor de Tráfego, quero conectar minha API Key e ver instantaneamente o gasto total do mês em uma Bento Box elegante com um gráfico de linha "shimmer".
- **US2:** Como Dono de Corretora, quero colocar o dashboard na TV da sala de reuniões em "Modo TV" e ver os dados de performance girando sem precisar tocar em nada.
- **US3:** Como Analista, quero filtrar apenas a "Campanha de Seguro Auto" e exportar um PDF impecável para enviar ao cliente via WhatsApp.

## 5. Plano de Execução (Fases)
1. **Infraestrutura:** Criar as tabelas de integração para armazenar as API Keys de forma criptografada (Meta & RD).
2. **Backend (Edge Functions):** Implementar os conectores `meta-ads-fetcher` e `rd-station-sync`.
3. **Frontend (Dashboard):** Construir a interface "Liquid Glass" com a Bento Grid.
4. **Modo TV & Animações:** Implementar a lógica de rotação de slides e transições fluidas.
5. **PDF Engine:** Configurar a geração de PDF mantendo a fidelidade visual.
