
# Plano: Refinamento do Motor Mistral V11 - Prompt Tuning, UI e Sync

## Resumo Executivo

O plano aborda três áreas principais:
1. **Prompt Tuning** na Edge Function para capturar sinônimos de "Prêmio Líquido" e garantir extração de datas
2. **UI Enhancement** com colunas de Vigência (Início/Fim) e CPF/CNPJ na tabela de revisão
3. **Sync Logic** aprimorada para garantir gravação do CPF extraído no cliente

---

## 1. Edge Function (`analyze-policy-mistral/index.ts`)

### Alterações no `EXTRACTION_PROMPT`

**Localização:** Linhas 23-86

**Refinamentos:**

Expandir a seção de **VALORES (PRÊMIOS)** para incluir sinônimos:

```
4. **VALORES (PRÊMIOS)**:
   - Retorne como NUMBER (float), não string
   - R$ 1.234,56 → 1234.56
   - SINÔNIMOS PARA PRÊMIO LÍQUIDO: 
     * "Prêmio Líquido", "Importe Líquido", "Prêmio Individual"
     * "Valor Líquido", "Premio Liquido", "Líquido do Seguro"
     * "Prêmio Comercial", "Prêmio Puro"
   - SINÔNIMOS PARA PRÊMIO TOTAL:
     * "Prêmio Total", "Valor Total", "Total a Pagar"
     * "Custo Total", "Premio com IOF"
   - Se não encontrar prêmio líquido, calcule: premio_total / 1.0738
   - Se AMBOS estiverem faltando, busque por "Parcela" e multiplique por número de parcelas
```

Expandir a seção de **DATAS** para ser mais agressiva:

```
5. **DATAS (VIGÊNCIA)**:
   - Formato OBRIGATÓRIO: YYYY-MM-DD (ex: 2024-03-15)
   - BUSQUE EXAUSTIVAMENTE por:
     * "Vigência", "Início da Vigência", "Data Inicial"
     * "Término", "Fim da Vigência", "Data Final"
     * "Válido de", "Válido até", "Período de"
     * Padrões: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
   - NUNCA retorne null se houver qualquer indício de data no documento
   - Se encontrar apenas UMA data, assuma vigência de 1 ano
```

**Arquivos afetados:**
- `supabase/functions/analyze-policy-mistral/index.ts` (linhas 23-86)

---

## 2. Frontend (`ImportPoliciesModal.tsx`)

### 2.1 Adicionar Colunas de Vigência na Tabela de Revisão

**Localização:** Componente `ReviewTableRow` (linhas 1139-1545)

**Nova coluna após "Apólice + Prêmio" (linha ~1367):**

```tsx
{/* Vigência */}
<TableCell className="py-3">
  {!item.processError && (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-zinc-600 text-xs">Início:</span>
        <Input
          type="date"
          value={item.dataInicio || ''}
          onChange={(e) => {
            markFieldEdited(item.id, 'dataInicio');
            updateItem(item.id, { dataInicio: e.target.value });
          }}
          className={cn(
            "h-6 text-xs bg-transparent border-zinc-700/50 px-1 w-32",
            !item.dataInicio && "border-red-500/50 bg-red-900/10",
            isFieldEdited(item.id, 'dataInicio') && "text-zinc-300 border-zinc-500/50"
          )}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-zinc-600 text-xs">Fim:</span>
        <Input
          type="date"
          value={item.dataFim || ''}
          onChange={(e) => {
            markFieldEdited(item.id, 'dataFim');
            updateItem(item.id, { dataFim: e.target.value });
          }}
          className={cn(
            "h-6 text-xs bg-transparent border-zinc-700/50 px-1 w-32",
            !item.dataFim && "border-red-500/50 bg-red-900/10",
            isFieldEdited(item.id, 'dataFim') && "text-zinc-300 border-zinc-500/50"
          )}
        />
      </div>
    </div>
  )}
</TableCell>
```

### 2.2 Mover CPF/CNPJ para Coluna Separada

**Atualmente:** CPF/CNPJ está agrupado com Nome do Cliente

**Proposta:** Criar coluna dedicada para melhor visibilidade

### 2.3 Atualizar TableHeader

**Localização:** Onde o `<TableHeader>` é definido (aproximadamente linha 1750-1800)

Adicionar header para nova coluna:
```tsx
<TableHead className="text-zinc-500 font-medium">Vigência</TableHead>
```

**Arquivos afetados:**
- `src/components/policies/ImportPoliciesModal.tsx`

---

## 3. Sync Logic (`policyImportService.ts`)

### 3.1 Aprimorar `upsertClientByDocument`

**Localização:** Linhas 662-796

**Alterações:**

1. Garantir que CPF seja SEMPRE gravado quando não existir:

```typescript
// Dentro do bloco de updates (linha ~699-710)
// v5.6: NOVO - Gravar CPF extraído se campo estiver vazio
if (normalized && !existing.cpf_cnpj) {
  updates.cpf_cnpj = normalized;
  console.log(`📋 [SYNC v5.6] CPF/CNPJ adicionado: ${normalized}`);
}
```

2. Adicionar log de auditoria para rastreamento:

```typescript
// Após aplicar updates (linha ~719)
if (Object.keys(updates).length > 0) {
  console.table([{
    cliente_id: existing.id,
    nome: existing.name,
    campos_atualizados: Object.keys(updates).join(', '),
    origem: 'PDF Import'
  }]);
}
```

**Arquivos afetados:**
- `src/services/policyImportService.ts`

---

## 4. Migração SQL (Opcional)

O índice único já existe (`idx_clientes_cpf_cnpj_unique`), mas podemos garantir:

```sql
-- Garante que o campo de CPF seja tratado de forma única por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_per_user 
ON clientes (cpf_cnpj, user_id) 
WHERE cpf_cnpj IS NOT NULL;
```

Esta migração é opcional pois o índice já foi criado na sessão anterior.

---

## 5. Detalhes Técnicos de Implementação

### Edge Function - Prompt Expandido

**Antes (linha 45-48):**
```
4. **VALORES (PRÊMIOS)**:
   - Retorne como NUMBER (float), não string
   - R$ 1.234,56 → 1234.56
   - Se não encontrar prêmio líquido, calcule: premio_total / 1.0738
```

**Depois:**
```
4. **VALORES (PRÊMIOS)** - BUSCA EXAUSTIVA:
   - Retorne como NUMBER (float), não string
   - R$ 1.234,56 → 1234.56
   - SINÔNIMOS ACEITOS PARA PRÊMIO LÍQUIDO:
     * "Prêmio Líquido", "Premio Liquido" (sem acento)
     * "Importe Líquido", "Valor Líquido"
     * "Prêmio Individual", "Prêmio Comercial"
     * "Prêmio Puro", "Líquido do Seguro"
   - SINÔNIMOS ACEITOS PARA PRÊMIO TOTAL:
     * "Prêmio Total", "Premio Total"
     * "Valor Total", "Total a Pagar"
     * "Custo Total", "Premio com IOF"
   - FALLBACK: Se não encontrar líquido, calcule: premio_total / 1.0738
   - FALLBACK 2: Se encontrar parcelas, multiplique valor_parcela × num_parcelas
```

### Frontend - Estrutura da Tabela de Revisão

**Ordem das colunas atual:**
1. Cliente (nome + CPF inline)
2. Apólice + Prêmio
3. Objeto Segurado
4. Seguradora
5. Ramo
6. Produtor
7. Comissão
8. Status

**Nova ordem proposta:**
1. Cliente (nome)
2. CPF/CNPJ (separado)
3. Apólice + Prêmio
4. Vigência (Início/Fim)
5. Objeto Segurado
6. Seguradora
7. Ramo
8. Produtor
9. Comissão
10. Status

---

## 6. Testes de Validação

### Teste 1: Sinônimos de Prêmio
1. Upload de PDF com "Importe Líquido" em vez de "Prêmio Líquido"
2. Verificar se o valor é extraído corretamente
3. Verificar log: `premio_liquido: X.XX`

### Teste 2: Datas de Vigência
1. Upload de PDF com datas em formato DD/MM/YYYY
2. Verificar se as colunas "Início" e "Fim" estão preenchidas
3. Verificar se datas estão no formato YYYY-MM-DD na tabela

### Teste 3: Sync de CPF
1. Subir apólice de cliente existente SEM CPF cadastrado
2. Verificar se após importação o CPF aparece no cadastro do cliente
3. Verificar log: `📋 [SYNC v5.6] CPF/CNPJ adicionado`

### Teste 4: Edição na UI
1. Clicar em campo de data e alterar
2. Verificar se borda muda para indicar edição manual
3. Verificar se validação remove erro quando data é preenchida

---

## 7. Resumo de Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `supabase/functions/analyze-policy-mistral/index.ts` | Expandir EXTRACTION_PROMPT |
| `src/components/policies/ImportPoliciesModal.tsx` | Adicionar colunas Vigência e CPF |
| `src/services/policyImportService.ts` | Melhorar sync de CPF |

---

## 8. Próximos Passos (Pós-Implementação)

1. **Detecção de Apólice Duplicada**: Verificar se número da apólice já existe antes de criar
2. **Log de Auditoria Visual**: Mostrar diff entre "IA extraiu" vs "Salvo no banco"
3. **Retry Inteligente**: Se Mistral falhar, tentar Gemini como fallback
