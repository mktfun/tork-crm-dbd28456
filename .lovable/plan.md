
# Plano: Refinamento do Parser v5.1 - Filtro de Ruído & Extração Avançada

## Visão Geral

Este plano aborda quatro áreas críticas do sistema de importação de apólices:

1. **Filtro de Nomes Institucionais** - Evitar que "TOKIO MARINE SEGURADORA" seja capturado como nome do segurado
2. **Extração de Prêmio Líquido** - Mais âncoras e regex mais robusto
3. **Extração de Veículos** - Modelo, marca e ano separados
4. **Lógica de Interface** - Montagem inteligente do campo "Objeto Segurado"

---

## 1. Parser: Filtro de Palavras Proibidas para Nome do Segurado

### Problema Atual
O parser atual usa a regex `NOME_REGEX = /([A-ZÀ-Ú\s]{5,60})/` após âncoras como `SEGURADO`, `NOME`, etc. Isso pode capturar acidentalmente nomes institucionais que aparecem no cabeçalho do PDF.

### Solução: Lista de Termos Proibidos + Validação de Qualidade

**Arquivo**: `src/utils/universalPolicyParser.ts`

Adicionar uma constante com termos que NÃO devem aparecer em nomes de segurados:

```text
INSTITUTIONAL_BLACKLIST = [
  'SEGURADORA', 'SEGUROS', 'CORRETORA', 'CORRETAGEM', 'ESTIPULANTE',
  'TOKIO', 'MARINE', 'PORTO', 'HDI', 'LIBERTY', 'ALLIANZ', 'MAPFRE',
  'SULAMERICA', 'AZUL', 'ZURICH', 'SOMPO', 'BRADESCO', 'ITAU', 'CAIXA',
  'MITSUI', 'GENERALI', 'POTTENCIAL', 'JUNTO', 'ALFA', 'BB SEGUROS',
  'LTDA', 'S/A', 'S.A', 'EIRELI', 'ME', 'EPP', 'CIA', 'COMPANHIA',
  'CNPJ', 'INSCRICAO', 'RAZAO SOCIAL', 'FANTASIA'
]
```

Criar função `isValidClientName()` que:
- Retorna `false` se o nome tiver menos de 2 palavras (ex: "Ra Jj")
- Retorna `false` se algum termo da blacklist estiver presente
- Retorna `false` se o nome tiver menos de 5 caracteres totais

Modificar a extração do nome para:
1. Extrair múltiplos candidatos (até 5 ocorrências das âncoras)
2. Filtrar cada candidato pela função de validação
3. Retornar o primeiro nome válido encontrado

---

## 2. Parser: Extração Aprimorada de Prêmio Líquido

### Problema Atual
As âncoras atuais (`PREMIOLIQUIDO`, `LIQUIDO`, `PREMIONET`) são limitadas. Muitos PDFs usam variações como:
- "PRÊMIO LÍQ."
- "VALOR LÍQUIDO"
- "LIQ. TOTAL"
- "PREMIO SEM IOF"

### Solução: Mais Âncoras + Regex Monetário Robusto

**Arquivo**: `src/utils/universalPolicyParser.ts`

Expandir lista de âncoras para prêmio líquido:

```text
PREMIO_LIQUIDO_ANCHORS = [
  'PREMIOLIQUIDO', 'LIQUIDO', 'PREMIONET', 'PREMIOSEMLOF', 
  'VALORLIQUIDO', 'LIQTOTAL', 'PREMIOANUAL', 'PREMIOMENSAL',
  'PREMIOCOMERCIAL', 'PREMIOLIQ', 'VLRLIQUIDO', 'VALORNET'
]
```

Criar regex mais tolerante para valores monetários brasileiros:

```text
VALOR_MONEY_REGEX = /(?:R\$|BRL)?\s*([\d]{1,3}(?:\.?\d{3})*,\d{2})/
```

Adicionar lógica de fallback:
1. Se prêmio líquido não encontrado após âncoras específicas
2. Buscar por "PREMIO" genérico e pegar o SEGUNDO valor monetário (o primeiro geralmente é IS/LMI)

---

## 3. Parser: Extração de Marca, Modelo e Ano do Veículo

### Problema Atual
O parser atual extrai apenas a placa. Para automóveis, é importante extrair também marca, modelo e ano para o campo "Objeto Segurado".

### Solução: Dicionário de Marcas + Âncoras de Veículo

**Arquivo**: `src/utils/universalPolicyParser.ts`

Criar dicionário de marcas automotivas:

```text
CAR_BRANDS = [
  'VW', 'VOLKSWAGEN', 'FIAT', 'CHEVROLET', 'GM', 'FORD', 'TOYOTA',
  'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN', 'JEEP', 'PEUGEOT', 'CITROEN',
  'KIA', 'MITSUBISHI', 'BMW', 'MERCEDES', 'AUDI', 'VOLVO', 'PORSCHE',
  'LAND ROVER', 'JAGUAR', 'SUZUKI', 'CHERY', 'JAC', 'CAOA', 'BYD'
]
```

Criar função `extractVehicleInfo()` que:
1. Busca âncoras: `VEICULO`, `MODELO`, `MARCA`, `FABRICANTE`
2. Extrai texto da janela (200 chars)
3. Procura por marcas do dicionário
4. Captura modelo adjacente (próximas 2-3 palavras)
5. Busca ano com regex: `/\b(19|20)\d{2}\b/`

Adicionar campos no retorno:
- `marca: string | null`
- `modelo: string | null`
- `ano_fabricacao: number | null`
- `ano_modelo: number | null`

---

## 4. Parser: Progressive Scan até Página 4 para Prêmio

### Problema Atual
O loop de páginas para quando `confidence >= 80%`. Porém, se o CPF é encontrado nas primeiras páginas (50 pts), o threshold pode ser atingido antes de encontrar o prêmio líquido (que frequentemente está nas páginas 3-4).

### Solução: Threshold Condicional

**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

Modificar a lógica de parada do Progressive Scan:

```text
Regra: Continuar até página 4 SE:
- premio_liquido NÃO foi encontrado (null ou 0)
- E ainda há mais páginas
MESMO que confidence >= 80%
```

Criar constante `MIN_PAGES_FOR_PREMIO = 4` e ajustar o loop:

```text
const shouldContinue = 
  hasMore && 
  currentPage + 2 <= MAX_PAGES && 
  (parsed.confidence < CONFIDENCE_THRESHOLD || 
   (currentPage < MIN_PAGES_FOR_PREMIO && !parsed.premio_liquido));
```

---

## 5. Interface: Montagem Inteligente do Objeto Segurado

### Problema Atual
Linha 565 do parser atual:
```javascript
objeto_segurado: placa ? `Veículo - Placa ${placa}` : null
```

E no modal (linhas 629-633):
```javascript
const objetoCompleto = policy.objeto_segurado 
  ? (policy.identificacao_adicional 
      ? `${policy.objeto_segurado} - ${policy.identificacao_adicional}` 
      : policy.objeto_segurado)
  : policy.descricao_bem || '';
```

Isso pode resultar em duplicação: "Veículo - Placa ABC1234 - ABC1234"

### Solução: Montagem Condicional por Ramo

**Arquivo 1**: `src/utils/universalPolicyParser.ts`

Modificar a montagem do `objeto_segurado` no retorno:

```text
Se AUTOMÓVEL e tem marca/modelo/placa:
  → "MARCA MODELO ANO - Placa: XXX-0000"
  
Se AUTOMÓVEL e só tem placa:
  → "Veículo - Placa: XXX-0000"
  
Se AUTOMÓVEL e só tem marca/modelo:
  → "MARCA MODELO ANO"
  
Se RESIDENCIAL e tem endereço:
  → endereço extraído
  
Senão:
  → null (preenchimento manual)
```

**Arquivo 2**: `src/components/policies/ImportPoliciesModal.tsx`

Simplificar a lógica do modal (linhas 629-633):
- Usar diretamente o `policy.objeto_segurado` já formatado pelo parser
- Não concatenar `identificacao_adicional` se já estiver inclusa

---

## 6. Reconciliação: Ignorar Nome Lixo do OCR

### Problema Atual
Se o OCR extrai um nome "lixo" como "Ra Jj" ou "SEGURADORA TOKIO", o sistema pode criar um cliente duplicado.

### Solução: Validação de Nome no Upsert

**Arquivo**: `src/services/policyImportService.ts`

Modificar `upsertClientByDocument()`:
- Se o nome tiver menos de 5 caracteres ou falhar na validação de blacklist
- Usar "Cliente Importado" como nome padrão
- Se o cliente JÁ EXISTE no banco, usar o nome existente (não sobrescrever com lixo)

Adicionar na função `reconcileClient()`:
- Se CPF encontrado e cliente existe, retornar o nome do banco (não o nome extraído pelo OCR)

---

## Resumo de Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/utils/universalPolicyParser.ts` | Blacklist, âncoras de prêmio, extração de veículo, montagem de objeto |
| `src/components/policies/ImportPoliciesModal.tsx` | Progressive scan condicional, simplificação do objeto |
| `src/services/policyImportService.ts` | Validação de nome lixo, uso do nome do banco |

---

## Detalhes Técnicos

### Novas Constantes no Parser

```typescript
const INSTITUTIONAL_BLACKLIST = [
  'SEGURADORA', 'SEGUROS', 'CORRETORA', 'CORRETAGEM', 'ESTIPULANTE',
  'TOKIO', 'MARINE', 'PORTO', 'HDI', 'LIBERTY', 'ALLIANZ', 'MAPFRE',
  'SULAMERICA', 'AZUL', 'ZURICH', 'SOMPO', 'BRADESCO', 'ITAU', 'CAIXA',
  'MITSUI', 'GENERALI', 'POTTENCIAL', 'JUNTO', 'ALFA', 'BBSEGUROS',
  'LTDA', 'SA', 'EIRELI', 'ME', 'EPP', 'CIA', 'COMPANHIA',
  'CNPJ', 'INSCRICAO', 'RAZAOSOCIAL', 'FANTASIA'
];

const CAR_BRANDS = [
  'VW', 'VOLKSWAGEN', 'FIAT', 'CHEVROLET', 'GM', 'FORD', 'TOYOTA',
  'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN', 'JEEP', 'PEUGEOT', 'CITROEN',
  'KIA', 'MITSUBISHI', 'BMW', 'MERCEDES', 'AUDI', 'VOLVO', 'PORSCHE',
  'LANDROVER', 'JAGUAR', 'SUZUKI', 'CHERY', 'JAC', 'CAOA', 'BYD'
];

const PREMIO_ANCHORS_EXPANDED = [
  'PREMIOLIQUIDO', 'LIQUIDO', 'PREMIONET', 'PREMIOSEMLOF',
  'VALORLIQUIDO', 'LIQTOTAL', 'PREMIOANUAL', 'PREMIOMENSAL',
  'PREMIOCOMERCIAL', 'PREMIOLIQ', 'VLRLIQUIDO', 'VALORNET',
  'PREMIOBASE', 'VALORSEGURO'
];
```

### Nova Função de Validação de Nome

```typescript
function isValidClientName(name: string): boolean {
  if (!name || name.length < 5) return false;
  
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return false;
  
  const upperName = name.toUpperCase();
  for (const forbidden of INSTITUTIONAL_BLACKLIST) {
    if (upperName.includes(forbidden)) return false;
  }
  
  return true;
}
```

### Nova Função de Extração de Veículo

```typescript
function extractVehicleInfo(
  originalText: string,
  alphaText: string,
  indexMap: number[]
): { marca: string | null; modelo: string | null; ano: number | null } {
  // 1. Busca janela após âncoras de veículo
  const vehicleAnchors = ['VEICULO', 'MODELO', 'MARCA', 'FABRICANTE', 'AUTOMOVELL'];
  
  for (const anchor of vehicleAnchors) {
    const idx = alphaText.indexOf(anchor);
    if (idx === -1) continue;
    
    const originalIdx = indexMap[idx + anchor.length] || 0;
    const window = originalText.substring(originalIdx, originalIdx + 200).toUpperCase();
    
    // 2. Procura marca conhecida
    for (const brand of CAR_BRANDS) {
      if (window.includes(brand)) {
        // 3. Captura texto após a marca (modelo)
        const brandIdx = window.indexOf(brand);
        const afterBrand = window.substring(brandIdx + brand.length, brandIdx + brand.length + 50);
        const modelMatch = afterBrand.match(/^\s*([A-Z0-9\-\s]{2,20})/);
        const modelo = modelMatch?.[1]?.trim() || null;
        
        // 4. Busca ano
        const anoMatch = window.match(/\b(19|20)\d{2}\b/);
        const ano = anoMatch ? parseInt(anoMatch[0]) : null;
        
        return { marca: brand, modelo, ano };
      }
    }
  }
  
  return { marca: null, modelo: null, ano: null };
}
```

---

## Testes de Validação

1. **PDF do ABRAHAO**: Nome deve aparecer como "ABRAHAO LINCOLN..." (sem "SEGURADORA" anterior)
2. **PDF com prêmio na página 4**: Valor do Prêmio Líquido deve ser extraído
3. **PDF de Automóvel**: Campo Objeto deve mostrar "COROLLA 2023 - Placa: BZK6780"
4. **Cliente duplicado**: Se CPF bater, usar nome do banco (não nome lixo do OCR)

---

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Limpeza de Lixo | 60% | 95% |
| Extração de Prêmio | 70% | 90% |
| Precisão de Nome | 70% | 95% |
| Objeto Formatado | 50% | 90% |
