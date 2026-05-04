# Design 055: Correção do Delay de Data na Importação OFX

## 1. Abordagem de Engenharia (Frontend)

Vamos substituir todas as instâncias inseguras de formatação de datas baseadas puramente no construtor padrão `new Date(string)` nos módulos de Extrato / Conciliação.

### Padrão Incorreto Atual
```tsx
import { format } from 'date-fns';

// Inseguro para YYYY-MM-DD
{format(new Date(item.transaction_date), 'dd/MM/yyyy')}
```

### Novo Padrão (Antigravity Seguro)
```tsx
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';

// Seguro, preserva o dia exato extraído do OFX sem aplicar o UTC fallback
{format(parseLocalDate(item.transaction_date), 'dd/MM/yyyy')}

// OU a forma mais simples (já que formatDate faz o toLocaleDateString):
import { formatDate } from '@/utils/dateUtils';
{formatDate(item.transaction_date)}
```

## 2. Mapa de Dependências

O conserto vai mexer estritamente no pacote `src/features/finance/components/reconciliation/` com dependência no utilitário local `src/utils/dateUtils.ts`.

Nenhuma intervenção com o Supabase MCP ou Stitch MCP é necessária, pois trata-se de um hotfix localizado de apresentação de dados (lógica de formatação de UI).

## 3. Divisão de Responsabilidade
- **Antigravity**: Ficará responsável por aplicar o `replace_file_content` na tela do ReconciliationWorkbench e ReconciliationPage, garantindo que o fuso horário seja respeitado e neutralizando a conversão invisível para UTC.
