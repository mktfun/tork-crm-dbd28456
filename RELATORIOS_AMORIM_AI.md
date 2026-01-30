# 📊 Guia de Relatórios do Amorim AI v2.0

## Visão Geral

O Amorim AI agora pode gerar **5 tipos de relatórios em PDF** sob demanda. Basta solicitar ao assistente e ele gerará o documento automaticamente.

---

## 1. Comparativo de Coberturas

**Descrição:** Tabela comparativa entre 2-3 seguradoras com recomendação técnica.

**Como Solicitar:**
```
"Gera um comparativo de vidros entre Porto Seguro e Tokio Marine"
"Compare a cobertura de portáteis da Zurich com a Liberty"
"Faz um comparativo de RC Profissional entre as seguradoras"
```

**Dados Necessários:**
```typescript
{
  titulo: "Comparativo: Cobertura de Vidros",
  data: "29/01/2025",
  seguradoras: [
    {
      nome: "Porto Seguro",
      ramo: "Residencial",
      coberturas: [
        { item: "Vidros", valor: "Até R$ 10.000", observacao: "Inclui mão de obra" },
        { item: "Espelhos", valor: "Até R$ 5.000", observacao: "" }
      ]
    },
    {
      nome: "Tokio Marine",
      ramo: "Residencial",
      coberturas: [
        { item: "Vidros", valor: "Até R$ 15.000", observacao: "Inclui mão de obra" },
        { item: "Espelhos", valor: "Até R$ 7.000", observacao: "" }
      ]
    }
  ],
  recomendacao: "A Tokio Marine oferece melhor cobertura para vidros...",
  assinatura: "Seu Nome"
}
```

---

## 2. Análise de Sinistro

**Descrição:** Checklist de documentos obrigatórios e prazos críticos para acionamento de sinistro.

**Como Solicitar:**
```
"Me faz uma análise de sinistro de roubo de carro"
"Gera um checklist de documentos para sinistro de incêndio residencial"
"Qual é o procedimento para sinistro de vidro quebrado?"
```

**Dados Necessários:**
```typescript
{
  titulo: "Análise de Sinistro: Roubo de Automóvel",
  data: "29/01/2025",
  cliente: "João Silva",
  sinistro: {
    tipo: "Roubo",
    data: "28/01/2025",
    descricao: "Veículo roubado na Avenida Paulista"
  },
  checklist: [
    { item: "Boletim de Ocorrência (BO)", obrigatorio: true, observacao: "Essencial para qualquer sinistro de roubo" },
    { item: "Foto do veículo", obrigatorio: true, observacao: "Com placas visíveis" },
    { item: "Comprovante de propriedade", obrigatorio: true, observacao: "CRLV ou documentação do veículo" },
    { item: "Apólice original", obrigatorio: false, observacao: "Cópia digital aceita" }
  ],
  prazos: [
    { acao: "Comunicação do sinistro", prazo: "Até 24 horas após o ocorrido" },
    { acao: "Envio de documentação", prazo: "Até 30 dias" },
    { acao: "Resposta da seguradora", prazo: "Até 30 dias após recebimento completo" }
  ]
}
```

---

## 3. Produção Mensal

**Descrição:** Resumo de prêmios, comissões e apólices emitidas no mês, com breakdown por ramo e seguradora.

**Como Solicitar:**
```
"Me traz um relatório de produção de janeiro"
"Qual foi minha produção em dezembro?"
"Gera um relatório de produção por ramo"
"Quanto de comissão eu ganhei este mês?"
```

**Dados Necessários:**
```typescript
{
  mes: "Janeiro",
  ano: 2025,
  total_apolices: 45,
  total_premio: 125000.50,
  total_comissao: 18750.75,
  por_ramo: [
    {
      ramo: "Automóvel",
      apolices: 25,
      premio: 75000,
      comissao: 11250,
      taxa_media: 15.0
    },
    {
      ramo: "Residencial",
      apolices: 15,
      premio: 40000,
      comissao: 6000,
      taxa_media: 15.0
    },
    {
      ramo: "RC Profissional",
      apolices: 5,
      premio: 10000.50,
      comissao: 1500.75,
      taxa_media: 15.0
    }
  ],
  por_seguradora: [
    { seguradora: "Porto Seguro", apolices: 20, premio: 60000 },
    { seguradora: "Zurich", apolices: 12, premio: 35000 },
    { seguradora: "Liberty", apolices: 8, premio: 20000 },
    { seguradora: "Tokio Marine", apolices: 5, premio: 10000.50 }
  ]
}
```

---

## 4. Novos Clientes

**Descrição:** Listagem de clientes adicionados no mês com suas apólices e prêmios.

**Como Solicitar:**
```
"Quantos clientes novos eu ganhei este mês?"
"Me mostra os novos clientes de janeiro"
"Gera um relatório de crescimento da minha base"
"Quais foram os novos clientes e quanto eles trouxeram de prêmio?"
```

**Dados Necessários:**
```typescript
{
  mes: "Janeiro",
  ano: 2025,
  total_novos: 12,
  clientes: [
    {
      nome: "João Silva",
      data_criacao: "05/01/2025",
      apolices: 2,
      total_premio: 8500
    },
    {
      nome: "Maria Santos",
      data_criacao: "08/01/2025",
      apolices: 1,
      total_premio: 3200
    },
    {
      nome: "Carlos Oliveira",
      data_criacao: "12/01/2025",
      apolices: 3,
      total_premio: 15000
    }
    // ... mais clientes
  ]
}
```

---

## 5. Renovação

**Descrição:** Apólices que estão vencendo no mês com status de renovação.

**Como Solicitar:**
```
"Quais apólices vencem em fevereiro?"
"Me mostra as renovações pendentes"
"Gera um relatório de apólices vencendo este mês"
"Qual é o valor total em risco de não renovação?"
```

**Dados Necessários:**
```typescript
{
  mes: "Fevereiro",
  ano: 2025,
  total_vencendo: 18,
  renovacoes: [
    {
      cliente: "João Silva",
      apolice: "PS-12345-2024",
      seguradora: "Porto Seguro",
      ramo: "Automóvel",
      premio: 5000,
      data_vencimento: "15/02/2025",
      status: "Pendente"
    },
    {
      cliente: "Maria Santos",
      apolice: "ZUR-67890-2024",
      seguradora: "Zurich",
      ramo: "Residencial",
      premio: 3200,
      data_vencimento: "20/02/2025",
      status: "Em Contato"
    },
    {
      cliente: "Carlos Oliveira",
      apolice: "LIB-11111-2024",
      seguradora: "Liberty",
      ramo: "Automóvel",
      premio: 4500,
      data_vencimento: "28/02/2025",
      status: "Proposta Enviada"
    }
    // ... mais apólices
  ]
}
```

---

## Como o Amorim AI Usa Esses Relatórios

### Fluxo Automático:

1. **Usuário solicita:** "Gera um relatório de produção de janeiro"
2. **Amorim AI processa:**
   - Busca os dados no banco de dados Supabase
   - Estrutura os dados no formato correto
   - Chama a tool `generate_report_pdf` com `report_type: "producao_mensal"`
3. **Edge Function gera o PDF** com jsPDF
4. **PDF é retornado** para download

### Exemplos de Conversas:

**Exemplo 1: Produção**
```
Você: "Me traz um relatório de produção de janeiro"
Amorim AI: "Vou gerar seu relatório de produção para janeiro. Um momento..."
[Gera PDF com tabelas de prêmios, comissões e breakdown por ramo]
Amorim AI: "Pronto! Seu relatório está gerado. Você emitiu 45 apólices em janeiro, 
totalizando R$ 125.000,50 em prêmios e R$ 18.750,75 em comissões. 
O ramo de Automóvel foi o destaque com 25 apólices."
```

**Exemplo 2: Renovação**
```
Você: "Quais apólices vencem em fevereiro?"
Amorim AI: "Você tem 18 apólices vencendo em fevereiro, totalizando R$ 87.000 em risco.
Vou gerar um relatório detalhado para você acompanhar."
[Gera PDF com lista de apólices vencendo e status de renovação]
Amorim AI: "Relatório gerado! Destaque para 5 apólices ainda pendentes de contato.
Recomendo priorizar a renovação de João Silva (PS-12345) que vence em 15/02."
```

---

## Integração com Banco de Dados

O Amorim AI consultará as seguintes tabelas para gerar os relatórios:

| Relatório | Tabelas Consultadas |
| :--- | :--- |
| Comparativo | `ai_knowledge` (Base de Conhecimento RAG) |
| Análise Sinistro | `ai_knowledge` (Base de Conhecimento RAG) |
| Produção Mensal | `apolices`, `ramos`, `companies` |
| Novos Clientes | `clientes`, `apolices` |
| Renovação | `apolices` (filtrado por data de vencimento) |

---

## Próximos Passos

1. **Integração com Supabase Storage:** Fazer upload automático dos PDFs gerados para um bucket público
2. **Agendamento de Relatórios:** Configurar relatórios automáticos que são enviados por email
3. **Customização de Marca:** Adicionar logo da corretora e cores personalizadas nos PDFs
4. **Mais Tipos de Relatórios:** Adicionar análises de comissão, performance por cliente, etc.

---

## Referência Técnica

**Edge Function:** `supabase/functions/generate-report-pdf/index.ts`
**Tool no Amorim AI:** `generate_report_pdf`
**Biblioteca:** jsPDF 2.5.1
**Formatos Suportados:** PDF (retorno direto ou upload para Storage)

