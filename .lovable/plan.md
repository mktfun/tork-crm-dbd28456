
# Plano: Correção Completa de Vinculação de Cliente na Importação

## Diagnóstico

### Problema 1: Prefixo "Ra" no Nome
O OCR está capturando ruído tipo `"RA JOSE DA SILVA"` onde `"RA"` é lixo. O parser aplica Title Case e fica `"Ra Jose Da Silva"`.

**Causa raiz**: O parser aceita palavras de 2 caracteres como válidas, e "RA" passa na validação.

### Problema 2: Popover Não Abre/Funciona Mal
O Popover existe (linhas 1049-1090) mas:
- Pode estar sendo bloqueado por eventos
- Não mostra informações úteis (nome, telefone, email, CPF completo)
- Não permite trocar o cliente vinculado

### Problema 3: Não Dá Pra Selecionar Outro Cliente
Se a vinculação automática errar, não tem como buscar e selecionar o cliente correto manualmente.

### Problema 4: Dados do Cliente Não São Atualizados
Quando importa uma apolice com dados novos (telefone, email), essas infos não atualizam o cliente vinculado.

---

## Solucao

### Frente 1: Filtro de Ruido OCR no Parser

**Arquivo**: `src/utils/universalPolicyParser.ts`

Adicionar filtro para palavras curtas suspeitas no inicio do nome:

```typescript
// Apos extrair candidato de nome (linha ~780-790)
// v5.5: Remover prefixos de 2-3 chars que sao ruido comum de OCR
const NOISE_PREFIXES = ['RA', 'RG', 'CP', 'NR', 'N°', 'NO', 'SR', 'DR'];

function cleanOcrNoiseFromName(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  
  // Se primeira palavra é ruído típico de OCR, remove
  if (words.length > 2 && NOISE_PREFIXES.includes(words[0].toUpperCase())) {
    words.shift();
  }
  
  return words.join(' ');
}

// Aplicar antes de validar:
const cleanedCandidate = cleanOcrNoiseFromName(candidate);
if (isValidClientName(cleanedCandidate)) {
  nomeCliente = formatNameTitleCase(cleanedCandidate);
}
```

### Frente 2: Popover com Dados Completos + Busca de Cliente

**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

Transformar o Popover em um painel interativo com:
1. Dados completos do cliente (nome, CPF, telefone, email)
2. Botao para "Trocar Cliente" que abre busca igual ao CRM
3. Usar o `ClientSearchCombobox` já existente

```text
+------------------------------------------+
|  Cliente Vinculado                       |
+------------------------------------------+
| Nome: Marina Pereira Biso                |
| CPF:  359.396.078-88                     |
| Tel:  (11) 99999-9999                    |
| Email: marina@email.com                  |
+------------------------------------------+
| [Trocar Cliente]  [Desvincular]          |
+------------------------------------------+
```

Fluxo ao clicar "Trocar Cliente":
1. Abre dropdown de busca (ClientSearchCombobox)
2. Usuario digita nome/CPF/telefone
3. Seleciona cliente correto
4. Sistema atualiza item com novo clientId/clientName

### Frente 3: Atualizar Dados do Cliente ao Importar

**Arquivo**: `src/services/policyImportService.ts`

Modificar `upsertClientByDocument` para atualizar campos vazios:

```typescript
if (existing) {
  // v5.5: Atualiza campos vazios do cliente existente
  const updates: Record<string, any> = {};
  
  if (!existing.phone && telefone) updates.phone = telefone;
  if (!existing.email && email) updates.email = email;
  if (!existing.address && endereco) updates.address = endereco;
  
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('clientes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    console.log('Dados do cliente atualizados:', Object.keys(updates));
  }
  
  return { id: existing.id, created: false, name: existing.name };
}
```

### Frente 4: Hook de Clientes para Busca

Utilizar o hook `useAllClients` já existente para alimentar o ClientSearchCombobox no modal de importacao.

---

## Alteracoes por Arquivo

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/universalPolicyParser.ts` | Adicionar `cleanOcrNoiseFromName()` para filtrar prefixos de ruido |
| `src/services/policyImportService.ts` | Atualizar campos vazios do cliente no `upsertClientByDocument()`, buscar mais dados (phone, email) |
| `src/components/policies/ImportPoliciesModal.tsx` | Novo Popover com dados completos + busca de cliente integrada |

---

## Resultado Esperado

1. **Nome correto**: "Marina Pereira Biso" em vez de "Ra Marina"
2. **Popover funcional**: Mostra dados completos do cliente vinculado
3. **Busca de cliente**: Botao "Trocar Cliente" abre busca igual CRM
4. **Atualizacao de dados**: Telefone/email novos atualizam cliente existente
5. **Vinculacao manual**: Se vinculacao automatica errar, usuario corrige facilmente

---

## Detalhes Tecnicos

### Limpeza de Ruido OCR

```typescript
const NOISE_PREFIXES = [
  'RA', 'RG', 'CP', 'NR', 'NO', 'SR', 'DR', 'SRA', 'DRA',
  'N°', 'Nº', 'CPF', 'CNPJ', 'DOC', 'SEQ', 'COD', 'REF'
];

function cleanOcrNoiseFromName(rawName: string): string {
  const words = rawName.trim().split(/\s+/);
  
  // Remove prefixos de ruido no inicio
  while (words.length > 2) {
    const first = words[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (NOISE_PREFIXES.includes(first) || (first.length <= 2 && /^[A-Z0-9]+$/.test(first))) {
      words.shift();
    } else {
      break;
    }
  }
  
  return words.join(' ');
}
```

### Popover Expandido com Busca

```tsx
<Popover>
  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
    <Badge className="cursor-pointer hover:bg-zinc-600/40">
      <UserCheck className="w-3 h-3 mr-1" />
      Vinculado
    </Badge>
  </PopoverTrigger>
  <PopoverContent className="w-80 bg-zinc-900/95 border-zinc-700 p-0 z-[200]" side="top">
    <div className="p-3 border-b border-zinc-700/50">
      <div className="flex items-center justify-between">
        <span className="text-zinc-200 font-medium text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-green-400" />
          Cliente Vinculado
        </span>
        <Badge variant="outline" className="text-[10px]">
          {item.matchedBy === 'cpf_cnpj' ? 'CPF/CNPJ' : 
           item.matchedBy === 'name_fuzzy' ? 'Nome' : 'Auto'}
        </Badge>
      </div>
    </div>
    
    <div className="p-3 space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-zinc-500">Nome:</span>
        <span className="text-zinc-200 font-medium">{item.clientName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-500">CPF/CNPJ:</span>
        <span className="text-zinc-300 font-mono">{formatCpf(item.clientCpfCnpj)}</span>
      </div>
      {clientDetails?.phone && (
        <div className="flex justify-between">
          <span className="text-zinc-500">Telefone:</span>
          <span className="text-zinc-300">{clientDetails.phone}</span>
        </div>
      )}
      {clientDetails?.email && (
        <div className="flex justify-between">
          <span className="text-zinc-500">Email:</span>
          <span className="text-zinc-300 truncate max-w-[150px]">{clientDetails.email}</span>
        </div>
      )}
    </div>
    
    <div className="p-2 border-t border-zinc-700/50 flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        className="flex-1 h-7 text-xs"
        onClick={() => setShowClientSearch(item.id)}
      >
        Trocar Cliente
      </Button>
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-7 text-xs text-zinc-400"
        onClick={() => handleUnlinkClient(item.id)}
      >
        Desvincular
      </Button>
    </div>
  </PopoverContent>
</Popover>

{/* Dialog de busca de cliente */}
{showClientSearch === item.id && (
  <ClientSearchCombobox
    clients={allClients.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || ''
    }))}
    value={item.clientId || ''}
    onValueChange={(newClientId) => handleClientChange(item.id, newClientId)}
    isLoading={loadingClients}
    placeholder="Buscar cliente..."
  />
)}
```

### Atualizacao de Dados do Cliente

```typescript
// policyImportService.ts - upsertClientByDocument v5.5
if (existing) {
  const updates: Record<string, any> = {};
  
  // Atualiza nome se o existente era lixo
  if (!isValidClientName(existing.name)) {
    const safeName = sanitizeClientName(nome);
    if (safeName !== existing.name) updates.name = safeName;
  }
  
  // v5.5: Preenche campos vazios com dados do PDF
  if (telefone && !existing.phone) updates.phone = telefone;
  if (email && !existing.email) updates.email = email;
  if (endereco && !existing.address) updates.address = endereco;
  
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    await supabase.from('clientes').update(updates).eq('id', existing.id);
    console.log(`🔄 [UPSERT v5.5] Cliente atualizado:`, Object.keys(updates));
  }
  
  return { 
    id: existing.id, 
    created: false, 
    name: updates.name || existing.name 
  };
}
```
