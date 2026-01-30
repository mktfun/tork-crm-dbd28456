import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== TIPOS DE DADOS ==========
interface ComparativoData {
  titulo: string;
  data: string;
  seguradoras: {
    nome: string;
    ramo: string;
    coberturas: {
      item: string;
      valor: string;
      observacao?: string;
    }[];
  }[];
  recomendacao: string;
  assinatura?: string;
}

interface AnaliseSinistroData {
  titulo: string;
  data: string;
  cliente: string;
  sinistro: {
    tipo: string;
    data: string;
    descricao: string;
  };
  checklist: {
    item: string;
    obrigatorio: boolean;
    observacao?: string;
  }[];
  prazos: {
    acao: string;
    prazo: string;
  }[];
}

interface ProducaoMensalData {
  mes: string;
  ano: number;
  total_apolices: number;
  total_premio: number;
  total_comissao: number;
  por_ramo: {
    ramo: string;
    apolices: number;
    premio: number;
    comissao: number;
    taxa_media: number;
  }[];
  por_seguradora: {
    seguradora: string;
    apolices: number;
    premio: number;
  }[];
}

interface NovosClientesData {
  mes: string;
  ano: number;
  total_novos: number;
  clientes: {
    nome: string;
    data_criacao: string;
    apolices: number;
    total_premio: number;
  }[];
}

interface RenovacaoData {
  mes: string;
  ano: number;
  total_vencendo: number;
  renovacoes: {
    cliente: string;
    apolice: string;
    seguradora: string;
    ramo: string;
    premio: number;
    data_vencimento: string;
    status: string;
  }[];
}

// ========== GERADOR DE PDF: COMPARATIVO ==========
function generateComparativoPDF(data: ComparativoData): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
  doc.text(data.titulo, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${data.data}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;

  // Tabela Comparativa
  const seguradoras = data.seguradoras;
  const maxCoberturas = Math.max(...seguradoras.map(s => s.coberturas.length));

  // Cabeçalho da tabela
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');

  const colWidth = (pageWidth - 20) / (seguradoras.length + 1);
  let xPosition = 10;

  // Coluna de itens
  doc.rect(xPosition, yPosition, colWidth, 8, 'F');
  doc.text('Cobertura', xPosition + 2, yPosition + 6);
  xPosition += colWidth;

  // Colunas de seguradoras
  for (const seguradora of seguradoras) {
    doc.rect(xPosition, yPosition, colWidth, 8, 'F');
    doc.text(seguradora.nome.substring(0, 12), xPosition + 2, yPosition + 6);
    xPosition += colWidth;
  }

  yPosition += 10;

  // Linhas de dados
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  for (let i = 0; i < maxCoberturas; i++) {
    xPosition = 10;

    // Coluna de itens
    const item = i < seguradoras[0].coberturas.length ? seguradoras[0].coberturas[i].item : '';
    doc.rect(xPosition, yPosition, colWidth, 7);
    doc.text(item.substring(0, 15), xPosition + 2, yPosition + 5);
    xPosition += colWidth;

    // Colunas de valores
    for (const seguradora of seguradoras) {
      doc.rect(xPosition, yPosition, colWidth, 7);
      const cobertura = seguradora.coberturas[i];
      if (cobertura) {
        doc.text(cobertura.valor.substring(0, 15), xPosition + 2, yPosition + 5);
      }
      xPosition += colWidth;
    }

    yPosition += 7;

    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 15;
    }
  }

  // Recomendação
  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Recomendação de Especialista:', 10, yPosition);

  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const recommendationLines = doc.splitTextToSize(data.recomendacao, pageWidth - 20);
  doc.text(recommendationLines, 10, yPosition);

  // Rodapé
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado pelo Amorim AI - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  if (data.assinatura) {
    doc.text(`Assinado por: ${data.assinatura}`, pageWidth / 2, yPosition + 5, { align: 'center' });
  }

  return doc.output('arraybuffer') as Uint8Array;
}

// ========== GERADOR DE PDF: ANÁLISE DE SINISTRO ==========
function generateAnaliseSinistroPDF(data: AnaliseSinistroData): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
  doc.text(data.titulo, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${data.data} | Cliente: ${data.cliente}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;

  // Informações do Sinistro
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Informações do Sinistro:', 10, yPosition);

  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text(`Tipo: ${data.sinistro.tipo}`, 10, yPosition);
  yPosition += 6;
  doc.text(`Data do Sinistro: ${data.sinistro.data}`, 10, yPosition);
  yPosition += 6;

  const descLines = doc.splitTextToSize(`Descrição: ${data.sinistro.descricao}`, pageWidth - 20);
  doc.text(descLines, 10, yPosition);
  yPosition += descLines.length * 6 + 4;

  // Checklist
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Checklist de Documentos Obrigatórios:', 10, yPosition);

  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  for (const item of data.checklist) {
    const checkbox = item.obrigatorio ? '☑' : '☐';
    const obligation = item.obrigatorio ? '(OBRIGATÓRIO)' : '(Opcional)';
    doc.setTextColor(item.obrigatorio ? 220, 20, 20 : 100, 100, 100);
    doc.text(`${checkbox} ${item.item} ${obligation}`, 15, yPosition);
    yPosition += 6;

    if (item.observacao) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`   → ${item.observacao}`, 20, yPosition);
      yPosition += 4;
      doc.setFontSize(9);
    }

    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 15;
    }
  }

  // Prazos
  yPosition += 6;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Prazos Importantes:', 10, yPosition);

  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 20, 20);

  for (const prazo of data.prazos) {
    doc.text(`⏰ ${prazo.acao}: ${prazo.prazo}`, 15, yPosition);
    yPosition += 6;
  }

  // Rodapé
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado pelo Amorim AI - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}

// ========== GERADOR DE PDF: PRODUÇÃO MENSAL ==========
function generateProducaoMensalPDF(data: ProducaoMensalData): Uint8Array {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(33, 33, 33);
  doc.text(`Relatório de Produção - ${data.mes}/${data.ano}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;

  // Resumo Geral
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('Resumo Geral', 15, yPosition);

  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  doc.text(`Total de Apólices: ${data.total_apolices}`, 15, yPosition);
  yPosition += 8;
  doc.text(`Total de Prêmios: ${formatCurrency(data.total_premio)}`, 15, yPosition);
  yPosition += 8;
  doc.text(`Total de Comissões: ${formatCurrency(data.total_comissao)}`, 15, yPosition);

  yPosition += 12;

  // Tabela por Ramo
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('Produção por Ramo', 15, yPosition);

  yPosition += 8;

  // Cabeçalho da tabela
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');

  const colWidths = [40, 30, 40, 40, 30];
  let xPos = 15;

  doc.rect(xPos, yPosition, colWidths[0], 8, 'F');
  doc.text('Ramo', xPos + 2, yPosition + 6);
  xPos += colWidths[0];

  doc.rect(xPos, yPosition, colWidths[1], 8, 'F');
  doc.text('Apólices', xPos + 2, yPosition + 6);
  xPos += colWidths[1];

  doc.rect(xPos, yPosition, colWidths[2], 8, 'F');
  doc.text('Prêmio', xPos + 2, yPosition + 6);
  xPos += colWidths[2];

  doc.rect(xPos, yPosition, colWidths[3], 8, 'F');
  doc.text('Comissão', xPos + 2, yPosition + 6);
  xPos += colWidths[3];

  doc.rect(xPos, yPosition, colWidths[4], 8, 'F');
  doc.text('Taxa %', xPos + 2, yPosition + 6);

  yPosition += 10;

  // Dados da tabela
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  for (const ramo of data.por_ramo) {
    xPos = 15;

    doc.rect(xPos, yPosition, colWidths[0], 7);
    doc.text(ramo.ramo, xPos + 2, yPosition + 5);
    xPos += colWidths[0];

    doc.rect(xPos, yPosition, colWidths[1], 7);
    doc.text(ramo.apolices.toString(), xPos + 2, yPosition + 5);
    xPos += colWidths[1];

    doc.rect(xPos, yPosition, colWidths[2], 7);
    doc.text(formatCurrency(ramo.premio), xPos + 2, yPosition + 5);
    xPos += colWidths[2];

    doc.rect(xPos, yPosition, colWidths[3], 7);
    doc.text(formatCurrency(ramo.comissao), xPos + 2, yPosition + 5);
    xPos += colWidths[3];

    doc.rect(xPos, yPosition, colWidths[4], 7);
    doc.text(ramo.taxa_media.toFixed(2) + '%', xPos + 2, yPosition + 5);

    yPosition += 7;

    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 15;
    }
  }

  // Rodapé
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado pelo Amorim AI - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}

// ========== GERADOR DE PDF: NOVOS CLIENTES ==========
function generateNovosClientesPDF(data: NovosClientesData): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
  doc.text(`Novos Clientes - ${data.mes}/${data.ano}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;

  // Resumo
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text(`Total de Novos Clientes: ${data.total_novos}`, 15, yPosition);

  yPosition += 10;

  // Tabela de clientes
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');

  const colWidths = [50, 35, 30, 35];
  let xPos = 10;

  doc.rect(xPos, yPosition, colWidths[0], 7, 'F');
  doc.text('Cliente', xPos + 2, yPosition + 5);
  xPos += colWidths[0];

  doc.rect(xPos, yPosition, colWidths[1], 7, 'F');
  doc.text('Data', xPos + 2, yPosition + 5);
  xPos += colWidths[1];

  doc.rect(xPos, yPosition, colWidths[2], 7, 'F');
  doc.text('Apólices', xPos + 2, yPosition + 5);
  xPos += colWidths[2];

  doc.rect(xPos, yPosition, colWidths[3], 7, 'F');
  doc.text('Prêmio Total', xPos + 2, yPosition + 5);

  yPosition += 9;

  // Dados
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  for (const cliente of data.clientes) {
    xPos = 10;

    doc.rect(xPos, yPosition, colWidths[0], 6);
    doc.text(cliente.nome.substring(0, 25), xPos + 2, yPosition + 4);
    xPos += colWidths[0];

    doc.rect(xPos, yPosition, colWidths[1], 6);
    doc.text(cliente.data_criacao, xPos + 2, yPosition + 4);
    xPos += colWidths[1];

    doc.rect(xPos, yPosition, colWidths[2], 6);
    doc.text(cliente.apolices.toString(), xPos + 2, yPosition + 4);
    xPos += colWidths[2];

    doc.rect(xPos, yPosition, colWidths[3], 6);
    doc.text(formatCurrency(cliente.total_premio), xPos + 2, yPosition + 4);

    yPosition += 6;

    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 15;
    }
  }

  // Rodapé
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado pelo Amorim AI - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}

// ========== GERADOR DE PDF: RENOVAÇÃO ==========
function generateRenovacaoPDF(data: RenovacaoData): Uint8Array {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
  doc.text(`Apólices para Renovação - ${data.mes}/${data.ano}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;

  // Resumo
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(220, 20, 20);
  doc.text(`Total Vencendo: ${data.total_vencendo} apólices`, 15, yPosition);

  yPosition += 10;

  // Tabela de renovações
  doc.setFillColor(220, 20, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');

  const colWidths = [35, 25, 25, 20, 25, 25, 20];
  let xPos = 10;

  doc.rect(xPos, yPosition, colWidths[0], 7, 'F');
  doc.text('Cliente', xPos + 1, yPosition + 5);
  xPos += colWidths[0];

  doc.rect(xPos, yPosition, colWidths[1], 7, 'F');
  doc.text('Apólice', xPos + 1, yPosition + 5);
  xPos += colWidths[1];

  doc.rect(xPos, yPosition, colWidths[2], 7, 'F');
  doc.text('Seguradora', xPos + 1, yPosition + 5);
  xPos += colWidths[2];

  doc.rect(xPos, yPosition, colWidths[3], 7, 'F');
  doc.text('Ramo', xPos + 1, yPosition + 5);
  xPos += colWidths[3];

  doc.rect(xPos, yPosition, colWidths[4], 7, 'F');
  doc.text('Prêmio', xPos + 1, yPosition + 5);
  xPos += colWidths[4];

  doc.rect(xPos, yPosition, colWidths[5], 7, 'F');
  doc.text('Vencimento', xPos + 1, yPosition + 5);
  xPos += colWidths[5];

  doc.rect(xPos, yPosition, colWidths[6], 7, 'F');
  doc.text('Status', xPos + 1, yPosition + 5);

  yPosition += 9;

  // Dados
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  for (const renovacao of data.renovacoes) {
    xPos = 10;

    doc.rect(xPos, yPosition, colWidths[0], 6);
    doc.text(renovacao.cliente.substring(0, 15), xPos + 1, yPosition + 4);
    xPos += colWidths[0];

    doc.rect(xPos, yPosition, colWidths[1], 6);
    doc.text(renovacao.apolice.substring(0, 10), xPos + 1, yPosition + 4);
    xPos += colWidths[1];

    doc.rect(xPos, yPosition, colWidths[2], 6);
    doc.text(renovacao.seguradora.substring(0, 12), xPos + 1, yPosition + 4);
    xPos += colWidths[2];

    doc.rect(xPos, yPosition, colWidths[3], 6);
    doc.text(renovacao.ramo.substring(0, 8), xPos + 1, yPosition + 4);
    xPos += colWidths[3];

    doc.rect(xPos, yPosition, colWidths[4], 6);
    doc.text(formatCurrency(renovacao.premio), xPos + 1, yPosition + 4);
    xPos += colWidths[4];

    doc.rect(xPos, yPosition, colWidths[5], 6);
    doc.text(renovacao.data_vencimento, xPos + 1, yPosition + 4);
    xPos += colWidths[5];

    doc.rect(xPos, yPosition, colWidths[6], 6);
    const statusColor = renovacao.status === 'Renovada' ? [0, 128, 0] : renovacao.status === 'Não Renovada' ? [220, 20, 20] : [255, 165, 0];
    doc.setTextColor(...statusColor);
    doc.text(renovacao.status, xPos + 1, yPosition + 4);
    doc.setTextColor(0, 0, 0);

    yPosition += 6;

    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 15;
    }
  }

  // Rodapé
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado pelo Amorim AI - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}

// ========== HANDLER PRINCIPAL ==========
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { report_type, data, user_id } = await req.json();

    if (!report_type || !data) {
      return new Response(
        JSON.stringify({ error: 'report_type e data são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pdfBuffer: Uint8Array;
    let fileName: string;

    // Gerar PDF conforme tipo
    switch (report_type) {
      case 'comparativo':
        pdfBuffer = generateComparativoPDF(data as ComparativoData);
        fileName = `comparativo_${Date.now()}.pdf`;
        break;

      case 'analise_sinistro':
        pdfBuffer = generateAnaliseSinistroPDF(data as AnaliseSinistroData);
        fileName = `analise_sinistro_${Date.now()}.pdf`;
        break;

      case 'producao_mensal':
        pdfBuffer = generateProducaoMensalPDF(data as ProducaoMensalData);
        fileName = `producao_mensal_${Date.now()}.pdf`;
        break;

      case 'novos_clientes':
        pdfBuffer = generateNovosClientesPDF(data as NovosClientesData);
        fileName = `novos_clientes_${Date.now()}.pdf`;
        break;

      case 'renovacao':
        pdfBuffer = generateRenovacaoPDF(data as RenovacaoData);
        fileName = `renovacao_${Date.now()}.pdf`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Tipo de relatório não suportado: ${report_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[REPORT-PDF] Generated ${report_type} report: ${fileName}`);

    // Retornar PDF diretamente
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: unknown) {
    console.error('Error generating report PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to generate report PDF', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
