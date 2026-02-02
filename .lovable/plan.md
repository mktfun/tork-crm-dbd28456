
# Plano de Otimização: Chat da IA Travando em Respostas Longas

## Problema Identificado

O chat do Assistente Tork trava e exige recarga da página quando:
- Respostas são muito longas (tabelas, relatórios técnicos)
- A conversa tem muitas mensagens

### Causas Técnicas

1. **Rendering excessivo durante streaming**: O componente `AIResponseRenderer` processa Markdown completo a cada pequeno chunk de texto recebido (centenas de vezes por resposta)

2. **Falta de virtualização**: Todas as mensagens permanecem no DOM, causando degradação progressiva de performance

3. **Scroll agressivo**: O `scrollTo({ behavior: 'smooth' })` dispara a cada atualização de conteúdo, sobrecarregando o browser

4. **ReactMarkdown sem otimização**: O parser de Markdown roda integralmente mesmo quando apenas um caractere é adicionado

## Solução Proposta

### 1. Debounce do Markdown Rendering (Prioridade Alta)

Durante o streaming, renderizar o texto bruto e só processar Markdown após estabilização:

```text
+-------------------+     +--------------------+     +-------------------+
| Streaming chunk   | --> | Render texto bruto | --> | Debounce 300ms    |
| (alta frequência) |     | (rápido)           |     | sem novos chunks  |
+-------------------+     +--------------------+     +-------------------+
                                                              |
                                                              v
                                                    +-------------------+
                                                    | Render Markdown   |
                                                    | (processamento)   |
                                                    +-------------------+
```

Arquivo: `src/components/ai/responses/AIResponseRenderer.tsx`
- Adicionar prop `isStreaming` para detectar modo de streaming
- Durante streaming: renderizar texto com formatação mínima
- Após streaming: processar Markdown completo

### 2. Throttle do Auto-Scroll (Prioridade Alta)

Limitar frequência do scroll automático para máximo 1x por segundo:

Arquivo: `src/components/ai/AmorimAIFloating.tsx`
- Criar ref para controlar último timestamp de scroll
- Verificar intervalo mínimo antes de executar novo scroll

### 3. Memoização de Mensagens Antigas (Prioridade Média)

Evitar re-render de mensagens que não mudaram:

Arquivo: `src/components/ai/AmorimAIFloating.tsx`
- Extrair renderização de mensagem para componente separado
- Aplicar `React.memo()` com comparação por ID e conteúdo
- Mensagens concluídas nunca re-renderizam

### 4. Lazy Loading do Histórico (Prioridade Baixa)

Para conversas muito longas, carregar apenas as últimas N mensagens visíveis:

- Implementar paginação reversa (scroll para cima carrega mais)
- Limite inicial de 50 mensagens

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ai/responses/AIResponseRenderer.tsx` | Adicionar modo streaming com debounce |
| `src/components/ai/AmorimAIFloating.tsx` | Throttle scroll, memoização de mensagens |
| `src/hooks/useAIConversations.ts` | Passar flag `isStreaming` para mensagem atual |

## Resultado Esperado

- Streaming suave mesmo em respostas de 10.000+ caracteres
- Conversas com 50+ mensagens sem degradação
- Scroll responsivo sem travar a interface
- Formatação Markdown completa após conclusão da resposta
