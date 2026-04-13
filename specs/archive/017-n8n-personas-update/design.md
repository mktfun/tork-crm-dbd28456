# Design: Atualização das Personas N8n

## 1. UI / Frontend (Antigravity)
- **Nenhuma alteração de componentes visuais é necessária**. O Autopilot e os Wizards de IA utilizam a função `getPresetById` e o mapeamento de `AI_PERSONA_PRESETS` dinamicamente. O input "Missão principal" já existe na UI e seu valor já é repassado no payload salvo no banco de dados da automação de funil.
- O mapeamento original de `id`s (`proactive`, `technical`, `supportive`, `supportive_sales`) será alterado magicamente para ("O Vendedor", "O Técnico", "O Geral", "O Amigo"). A mudança de texto acontecerá mantendo a Key ID igual para não quebrar setups salvos.
  - *Decisão Adotada*: Manteremos os IDs antigos semanticamente próximos para não quebrar setups salvos e mudaremos apenas a lógica, nomes e descrições internamente no XML.
    - `id: 'proactive'` -> "O Vendedor"
    - `id: 'supportive_sales'` -> "O Amigo"
    - `id: 'technical'` -> "O Técnico"
    - `id: 'supportive'` -> "O Geral"

### Injeção de Missão Contínua (Prompt XML)
Todos os novos XMLs injetados em `aiPresets.ts` irão possuir uma diretiva de *Completion Protocol* apontando para a **MISSÃO**.  
A responsabilidade de unir o texto do Preset (Persona) + o texto do Input(Missão) será do **N8N** no momento da execução, ou seja, o CRM passará pelo Webhook/API as duas variáveis e o fluxo construirá o contexto final para enviar para a LLM. O `aiPresets.ts` apenas orientará a IA a focar nessa missão que será recebida.

## 2. Backend / Banco de Dados (Supabase MCP)
- Nenhuma alteração no Schema. Apenas uma refatoração no front-end em `aiPresets.ts`.

## 3. Mapa de Dependências
- `src/components/automation/aiPresets.ts`
  Abaixa as novas personas para a tela:
  - `src/components/automation/PipelineAiDefaultsModal.tsx`
  - `src/components/automation/AIOnboardingWizard.tsx`
