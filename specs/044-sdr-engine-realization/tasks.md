# Checklist de Tarefas: 044 SDR Engine Realization

## Fase 1: Dispatcher Termination
- [ ] Editar `supabase/functions/ai-assistant/index.ts`.
- [ ] Adicionar um `return` imediato após o bloco de processamento SDR. Se a resposta da engine SDR não for nula, o código não deve avançar para o Mentor AI.

## Fase 2: Brain Integration (engine-sdr.ts)
- [ ] Implementar a chamada ao modelo de IA dentro da função `processSDRFlow` em `engine-sdr.ts`.
- [ ] Criar a lógica de avaliação de nós de **Decisão** (Sim/Não real via LLM).
- [ ] Criar a lógica de geração de resposta para o nó de **Instrução Livre** (Passando o texto do bloco como instrução de sistema).
- [ ] Implementar loop de travessia automática (se um nó cair em outro nó que não exige input, processar imediatamente).

## Fase 3: Proibição de Leak (Prompt Guard)
- [ ] Definir o `SDR_SYSTEM_PROMPT` no backend que remove o modo Mentor e proíbe `<thinking>`.

## Fase 4: Validação do Simulador
- [ ] Testar no simulador se, ao digitar "olá", a IA responde exatamente conforme o desenho (ex: enviando a mensagem do primeiro bloco Message ou avaliando a Decisão).
- [ ] Verificar se o log do Supabase mostra a engine SDR sendo acionada e o encerramento da função.
- [ ] Comitar as mudanças (`feat(automation): realize sdr engine with llm integration and fix logic leak`).
