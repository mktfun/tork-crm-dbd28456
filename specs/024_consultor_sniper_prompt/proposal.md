# Spec 024: A Pílula Vermelha do Consultor Analítico (Fim das Alucinações)

## 1. O Problema Atual
O usuário evidenciou falhas críticas no Pitch gerado pela Inteligência do sistema no modo Batch (após a Spec 023):
1. **Alucinação Induzida:** O LLM inventou "João Silva" e cotações fakes da "Tokio Marine" apenas para satisfazer um trecho hardcoded do prompt antigo que exigia "Buscar_Cotacoes_Atuais" (uma tool que sequer estava mapeada no agente).
2. **Formatação Carnavalesca:** Excesso de emojis (frufru), textos gigantes e prolixos que cansam a leitura do consultor no WhatsApp.
3. **Chain of Thought Vazado:** O modelo despejava seu monólogo interno ("O usuário forneceu um extrato... Vou estruturar a resposta... Plano de execução") diretamente na mensagem final.

## 2. A Solução Proposta

Vamos aplicar um **Overhaul Cirúrgico e Minimalista** na função `buildConsultantSystemPrompt` (localizada dentro de `admin-dispatcher/index.ts`). A diretriz é converter o Consultor de um "Romancista de Seguros" para um "Militante Tático de Fechamento".

### Funcionalidades a Modificar
1. **Poda de Ferramentas Inúteis:** Remover do `<tools_guide>` qualquer instrução ou obrigatoriedade de chamar cotações externas inexistentes. Se a apólice tá no prompt, a base é SÓ ela.
2. **Estrutura "Tiro de Sniper" (Novo Pitch Guide):** O novo layout do pitch será estrito, enxuto e curto:
   - "Apólice [X] em seguradora [X], segurado [X], condutor [X] (vigência [Início]-[Fim])."
   - Pontos Cegos Encontrados (Balas curtas sobre furos identificados).
   - O que o corretor precisa fazer (Plano de ação claro).
3. **Proibição de Monólogos:** Uma flag forte em `<strict_restrictions>`: "PROIBIDO gerar 'Chain of Thought', explicações de raciocínio, ou detalhar 'O que farei agora'. Devolva APENAS o Pitch Final".
4. **Sem Frufru:** Cortar a obrigação de usar emojis. "Layout técnico, limpo e profissional tipo Markdown de Terminal".

### Fix Suplementar: O Watchdog da IA (Já executado isoladamente)
Baseado no comentário injetado, apliquei o hotfix de limpeza de Whitespace padding nas respostas SSE (no frontend) para sanar os travamentos causados por chunks cheios de `   `. O Watchdog de 15s de inatividade com isso também foi consertado.

## O Que Já Existe e Será Reutilizado
- A Infraestrutura toda (o override do N8N na spec 023 e o `ai-assistant` Local via edge funcion) permanece a mesma. A alteração está APENAS na modelagem verbal (Super System Prompt) injetada na fase de disparo.

## Critérios de Aceite
- Ao submeter um `/analise` -> PDF, o robô retornará zero alucinações, lerá exatamente Carina Pioli se for a Carina, não vai inventar João Silva e nem inventar o ranking de corretoras inexistentes.
