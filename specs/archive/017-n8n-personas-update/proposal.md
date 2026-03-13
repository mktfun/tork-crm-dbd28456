# Proposal: Atualização das Personas N8n (System Prompts)

## 1. Requisitos e Objetivo
O objetivo é substituir os system prompts (personas) predefinidos na plataforma pelo novo conjunto de 4 personas universais e elaboradas ("O Vendedor", "O Amigo", "O Técnico" e "O Geral"). Essas personas seguem a estrutura do "Trio de Ferro" e possuem instruções ricas sobre identidade, lógica de negócios, controle de fluxo e formatação de saída. 
Isso vai permitir que o n8n instancie agentes altamente capacitados que ajustam o comportamento de acordo com parâmetros dinâmicos de contexto (como nicho, nome do atendente/empresa, etapa do funil).

**Adendo Importante (Missão da Etapa):** Cada etapa do funil possui um campo na UI chamado "Missão Principal". Este campo é dinâmico e define o *objetivo tático* do agente naquela etapa específica (ex: "Coletar a idade", ou "Validar CNPJ"). Essa Missão será injetada no System Prompt via variável para que o agente saiba exatamente quando dar o objetivo como concluído.

## 2. O que já existe e será reutilizado
- **`src/components/automation/aiPresets.ts`**: Atualmente, este arquivo contém os presets `AI_PERSONA_PRESETS`. Ele será aproveitado, mas os prompts estáticos de dentro do array serão substituídos pelas novas personas.
- Modais e telas que consomem `aiPresets.ts` continuarão as mesmas; a interface vai carregar automaticamente os novos nomes e descrições se mantivermos a estrutura `AIPreset`.

## 3. O que precisa ser criado/alterado
- Modificar o array `AI_PERSONA_PRESETS` em `src/components/automation/aiPresets.ts`.
- Mapear as 4 novas opções:
  1. O Vendedor (SDR Agressivo/Focado)
  2. O Amigo (Consultivo/Rapport)
  3. O Técnico (Especialista/Autoridade)
  4. O Geral (Híbrido/Equilíbrio perfeito)
- Ajustar os identificadores (`id`) e descrições para refletir a nova abordagem universal, mantendo a compatibilidade de UI.

## 4. Critérios de Aceite
- [ ] O arquivo `aiPresets.ts` deve conter apenas as 4 novas personas como opções.
- [ ] As telas de configuração de IA do CRM (ex: AIOnboardingWizard, PipelineAiDefaultsModal) devem carregar os novos presets sem gerar erros visuais.
- [ ] Os "xmlPrompts" dentro de cada preset devem ser idênticos aos gerados no `system_prompts_personas.md`.
