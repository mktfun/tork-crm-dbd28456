# PROPOSAL: Autonomia Humana, Escalonamento e Correções no SDR (Spec 031)

## 1. Problema e Justificativa

Durante testes iniciais com o novo sistema autônomo do SDR via Supabase, além dos problemas técnicos de concorrência, identificaram-se gargalos na "saída" do fluxo autônomo para suporte humano, e no processo de triagem inicial:
1. **Falta de Percepção (Debounce):** Race-conditions durante mensagens picadas.
2. **Amnésia de Contexto (Robótico):** Clientes existentes tratados como novos clientes estritamente dentro da triagem.
3. **Triagem Restritiva / Beco Sem Saída:** Quando um cliente pede algo fora de vendas (ex: solicita "2ª via de boleto") onde a IA não tem um funil para agir, a IA atual trava ou mente. Faltam diretrizes para gerenciar solicitações de suporte e silenciamento elegante da IA.
4. **Falta de Escalonamento Automático e Desativação (24h):** Se a IA não consegue ajudar, deve repassar elegantemente a um admin, e aplicar um "Temporary Mute" (Soneca de 24h), sendo possível os admins manipularem esse estado do muting ativamente pelo app/chatwoot através de Etiquetas (Labels).

## 2. Visão da Solução

### 2.1 Padrão "Inner Monologue" e Debounce (Bugfixes)
- Implementação da tag `<thought>` para todo raciocínio lógico no back-end. Apenas a conclusão após as tags é enviada ao WhatsApp.
- Micropausa de encavalamento na fila nativa de resolução (`sdr_message_queue`).

### 2.2 Roteamento de Triagem Otimizado
- A IA fará a tomada de decisão (quando "Sem Negociação Ativa") baseada nos Pipelines/Estágios existentes.
- Em vez do prompt engessado na triagem inicial obrigar o bot a conduzir longos textos ou abrir sempre funis fechados, a IA ganha a permissão clara de: **(A)** Reconhecer necessidades de suporte; **(B)** Usar a tool `escalate_to_human` se envolver suporte técnico/2ª via.

### 2.3 Ferramenta de Escalonamento (Escalate to Human AI Mute)
- Criar a tool LLM chamada `escalate_to_human`. Quando acionada, ela:
  - **Instrui a IA a responder natural e pessoalmente**, sem quebrar o personagem (ex: "ok, irei providenciar sua segunda via, aguarde um momento por favor"). A IA nunca deve se referir a si mesma como bot ou dizer que vai repassar para "a equipe" — ela deve falar como o próprio Rodrigo (ou a persona da corretora) resolvendo a pendência.
  - Pausa a IA por 24 horas definindo uma flag inteligente de carência.
  - O muting se refletirá no banco de dados e através de um cruzamento de Etiqueta (Label) no Chatwoot para sinalização visual (ex: etiqueta `IA Pausada (24h)`).
  - Envia um alerta automático de transbordo (via WhatsApp/Chatwoot) para um número de telefone configurado no painel informando o admin sobre a necessidade de assumir a conversa manual.

### 2.4 Nova Configuração na Interface (Alertas)
  - Na tela de **Modelos e Automações** (`AutomationConfigTab.tsx`), adicionar um campo para preencher o **Número de Telefone para Alertas**. Esse telefone será salvo no registro da corretora, permitindo que a IA saiba para qual número mandar um WhatsApp de SOS interno quando escalar o caso.

## 3. Critérios de Aceite
- Mensagens fragmentadas processam juntas (debounce de 2s).
- IA não transparece tags `<thought>`.
- Diante de "2ª via" ou processos sem correspondência no CRM, a IA chama a tool `escalate_to_human`.
- O cliente silenciado por escalonamento não recebe respostas da IA num prazo de 24h a não ser que um limite seja removido manualmente por um broker.
- As integrações de labels com Chatwoot serão respeitadas para denotar "Mute temporário".
