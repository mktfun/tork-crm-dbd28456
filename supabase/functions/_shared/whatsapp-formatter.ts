/**
 * whatsapp-formatter.ts
 * ─────────────────────
 * Converte respostas Markdown/LLM para formatação nativa do WhatsApp.
 * Pipeline determinístico de 12 etapas.
 * 
 * Regras de formatação nativa do WhatsApp:
 *   *negrito*    → asterisco simples
 *   _itálico_    → underscore simples
 *   ~riscado~    → til simples
 *   ```mono```   → crase tripla (inline ok, bloco não renderiza)
 *   Listas       → texto puro com marcadores (WhatsApp não tem lista nativa)
 */

export function formatForWhatsApp(rawText: string): string {
  if (!rawText) return rawText;

  let text = rawText;

  // ─── Etapa 1: Strip <thinking>...</thinking> ───
  // Remove o bloco de raciocínio interno do LLM
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '');

  // ─── Etapa 2: Strip fences de código ─────────────────────────────────────
  // Remove blocos ```language ... ``` mas preserva o conteúdo interno se for texto simples
  text = text.replace(/```[a-z]*\n?([\s\S]*?)```/g, (_, inner: string) => inner.trim());

  // ─── Etapa 3: Títulos ### / ## / # → *Título* ────────────────────────────
  // Adiciona linha vazia acima para separação visual
  text = text.replace(/^#{1,3}\s+(.+)$/gm, '\n*$1*');

  // ─── Etapa 4: Negrito Markdown **texto** → *texto* ───────────────────────
  text = text.replace(/\*\*([\s\S]*?)\*\*/g, '*$1*');

  // ─── Etapa 5: Itálico _texto_ — mantido como _texto_ (nativo WA) ─────────
  // Não precisa de conversão, já é o mesmo formato WA.
  // Apenas garante que formatações do tipo _Titulo Longo Com Mais De 50 Chars_
  // que venham do markdown e fossem "títulizadas" sejam convertidas para *bold*.
  text = text.replace(/_([^_\n]+)_/g, (match: string, p1: string) => {
    // Se o conteúdo parece um título (curto e com maiúscula no início), converte para bold
    const isTitleLike = p1.length <= 60 && /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ0-9]/.test(p1.trim());
    if (isTitleLike) return `*${p1}*`;
    return match; // mantém _itálico_ normal
  });

  // ─── Etapa 6: Tabelas Markdown → listas "• Campo: Valor" ─────────────────
  text = convertMarkdownTables(text);

  // ─── Etapa 7: Listas não-ordenadas - item / * item → • item ──────────────
  // Apenas no início da linha, com espaço depois
  text = text.replace(/^[ \t]*[-*]\s+/gm, '• ');

  // ─── Etapa 8: Listas ordenadas — mantidas simples (1., 2., ...) ──────────
  // Nenhuma conversão necessária; o WhatsApp renderiza texto simples.
  // Apenas limpa recuos excessivos
  text = text.replace(/^[ \t]+(\d+\.)\s+/gm, '$1 ');

  // ─── Etapa 9: Checkboxes ─────────────────────────────────────────────────
  text = text.replace(/\[x\]/gi, '✅');
  text = text.replace(/\[ \]/g, '☐');

  // ─── Etapa 10: Blockquotes > texto → texto em itálico ────────────────────
  text = text.replace(/^>\s?(.+)$/gm, '_$1_');

  // ─── Etapa 11: Separadores --- → espaço duplo ────────────────────────────
  text = text.replace(/^-{3,}$/gm, '');

  // ─── Etapa 12: Normalização de espaçamento ───────────────────────────────
  // Máximo 2 quebras de linha consecutivas, sem espaços traseiros
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+$/gm, '');
  text = text.trim();

  return text;
}

/**
 * Converte tabelas Markdown para listas no estilo WhatsApp.
 * 
 * Entrada:
 *   | Campo | Valor |
 *   |-------|-------|
 *   | Nome  | João  |
 *
 * Saída:
 *   *Campo — Valor*
 *   • Nome: João
 */
function convertMarkdownTables(text: string): string {
  // Detecta blocos de tabela: 2+ linhas onde cada uma começa e termina com |
  const tableRegex = /((?:\|[^\n]+\|\n?){2,})/g;

  return text.replace(tableRegex, (tableBlock: string) => {
    const lines = tableBlock.trim().split('\n').map((l: string) => l.trim());

    if (lines.length < 2) return tableBlock;

    // Extrai células de uma linha
    const parseCells = (line: string): string[] =>
      line.split('|').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

    const headers = parseCells(lines[0]);

    // Pula linha separadora (|---|---|)
    const dataLines = lines.slice(1).filter((l: string) => !/^\|[-:|\s]+\|$/.test(l));

    if (dataLines.length === 0) {
      // Só há cabeçalho — exibe como negrito
      return `*${headers.join(' — ')}*\n`;
    }

    const output: string[] = [];

    // Se for tabela simples de 2 colunas (Campo | Valor), formata como "• Campo: Valor"
    if (headers.length === 2) {
      for (const line of dataLines) {
        const cells = parseCells(line);
        if (cells.length >= 2) {
          output.push(`• *${cells[0]}:* ${cells[1]}`);
        }
      }
      return output.join('\n') + '\n';
    }

    // Tabela com múltiplas colunas: cabeçalho em negrito + linhas como listas
    output.push(`*${headers.join(' | ')}*`);
    for (const line of dataLines) {
      const cells = parseCells(line);
      const parts: string[] = [];
      for (let i = 0; i < headers.length; i++) {
        const val = cells[i] || '—';
        parts.push(`${headers[i]}: ${val}`);
      }
      output.push(`• ${parts.join(' · ')}`);
    }

    return output.join('\n') + '\n';
  });
}
