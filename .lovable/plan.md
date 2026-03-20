

# Plano: Reescrever os 4 System Prompts com técnicas avançadas de humanização

## Diagnóstico

Os prompts atuais em `aiPresets.ts` têm problemas sérios:

1. **Emojis dentro de tags XML** (🛑, 💼, 📊) — poluem o prompt e confundem a IA
2. **Instruções genéricas** — "Vá direto ao ponto", "Texto curto" são vagas demais
3. **Sem técnicas avançadas** — faltam: chain-of-thought interno, few-shot examples, guardrails de alucinação, controle de tom por mensagem, anti-looping, fallback behavior
4. **Não adaptados por persona** — a estrutura é copy-paste com pequenas variações de adjetivo
5. **Sem simulação de pensamento** — a IA não tem um `<internal_reasoning>` para decidir o que fazer antes de responder
6. **Sem regras de contexto WhatsApp** — não há instrução sobre tamanho de mensagem, quebras, tempo de resposta percebido

## Solução — Prompt Engineering avançado por persona

Cada persona receberá um prompt completo com estas seções técnicas:

```text
<system_prompt>
  <identity>          — Quem é, backstory, traços de personalidade únicos
  <voice>             — Tom exato, vocabulário permitido/proibido, cadência
  <internal_reasoning>— Chain-of-thought silencioso antes de cada resposta
  <conversation_flow> — Regras de fluxo (1 pergunta, anti-loop, fallback)
  <qualification>     — Lógica de qualificação adaptada ao perfil
  <objection_handling>— Como lidar com objeções (específico por persona)
  <mission_protocol>  — Protocolo de conclusão com {{missao_ai}}
  <output_rules>      — Formatação WhatsApp (max chars, quebras, proibições)
  <few_shot_examples> — 2-3 exemplos de diálogo ideal por persona
  <guardrails>        — Anti-alucinação, anti-promessa, anti-fuga de contexto
</system_prompt>
```

### Diferenciação real entre personas

| Persona | Diferencial técnico no prompt |
|---|---|
| **O Vendedor** | Raciocínio interno focado em qualificação BANT, âncoras de preço, urgência artificial, tom assertivo sem ser rude |
| **O Amigo** | Espelhamento emocional (mirroring), validação antes de perguntar, transições suaves, vocabulário coloquial calibrado |
| **O Técnico** | Diagnóstico por eliminação, jargão controlado (adapta ao nível do lead), autoridade via dados, zero opinião pessoal |
| **O Geral** | Detecção dinâmica de contexto — começa amigável, endurece se o lead é B2B grande, suaviza se é pessoa física insegura |

### Few-shot examples (novo)

Cada persona terá 2-3 exemplos de troca de mensagens dentro de `<examples>` para ancorar o comportamento. Isso é a técnica mais eficaz para controlar tom e formato.

### Internal reasoning (novo)

```xml
<internal_reasoning>
Antes de CADA resposta, pense silenciosamente (não escreva isso):
1. O que o lead acabou de revelar? (dado novo)
2. O que ainda falta para completar a missão?
3. Qual a melhor próxima pergunta para avançar sem parecer interrogatório?
4. O tom da última mensagem dele foi positivo, neutro ou resistente?
   → Se resistente: valide antes de avançar
   → Se positivo: avance naturalmente
</internal_reasoning>
```

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/automation/aiPresets.ts` | Reescrever os 4 `xmlPrompt` com técnicas avançadas. Manter IDs (`proactive`, `supportive_sales`, `technical`, `supportive`), nomes e estrutura `AIPreset` intactos |

Sem migration. Sem mudança de backend. Apenas os prompts no frontend (que são injetados no dispatcher e sandbox).

