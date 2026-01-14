import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { drawPDFHeader, drawPDFFooter, PDF_COLORS } from './pdfHeader';

export interface ClientReportData {
  id: string;
  nome: string;
  cpfCnpj: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  dataNascimento: string | null;
  dataCadastro: string;
  status: string;
  // Dados agregados de apólices
  qtdeApolices: number;
  valorTotalPremio: number;
}

export interface ClientReportOptions {
  title: string;
  filters: {
    status?: string;
    tipo?: string; // PF ou PJ
    aniversariantes?: string; // mês
    busca?: string;
  };
  columns: {
    nomeDocumento: boolean;
    contatos: boolean;
    localizacao: boolean;
    carteira: boolean;
    datas: boolean;
  };
  sortBy: 'nome' | 'cadastro' | 'carteira' | 'aniversario';
}

// ========================================
// FORMATADORES
// ========================================

const formatCPFCNPJ = (value: string | null): string => {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  
  // CPF: 11 dígitos
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  // CNPJ: 14 dígitos
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

const formatPhone = (phone: string | null): string => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr: string | null, includeYear = true): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return format(date, includeYear ? 'dd/MM/yy' : 'dd/MM', { locale: ptBR });
  } catch {
    return '-';
  }
};

// ========================================
// GERADOR DE PDF - LANDSCAPE
// ========================================

export async function generateClientsReport(
  clients: ClientReportData[],
  options: ClientReportOptions
): Promise<void> {
  // 🎯 LANDSCAPE - Essencial para relatório de clientes
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Dimensões: 297mm x 210mm (largura x altura em landscape)
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // ~269mm

  // ========================================
  // ORDENAÇÃO
  // ========================================
  const sortedClients = [...clients].sort((a, b) => {
    switch (options.sortBy) {
      case 'nome':
        return a.nome.localeCompare(b.nome, 'pt-BR');
      case 'cadastro':
        return new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime();
      case 'carteira':
        return b.valorTotalPremio - a.valorTotalPremio;
      case 'aniversario':
        // Ordenar por dia/mês de aniversário
        const getMonthDay = (d: string | null) => {
          if (!d) return '99-99';
          const date = new Date(d);
          return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
        return getMonthDay(a.dataNascimento).localeCompare(getMonthDay(b.dataNascimento));
      default:
        return 0;
    }
  });

  // ========================================
  // CONSTRUIR COLUNAS DINAMICAMENTE
  // ========================================
  interface TableColumn {
    header: string;
    dataKey: string;
    width: number;
  }

  const columnDefs: TableColumn[] = [];

  // Colunas ativas
  if (options.columns.nomeDocumento) {
    columnDefs.push({ header: 'CLIENTE', dataKey: 'cliente', width: 65 });
  }
  if (options.columns.contatos) {
    columnDefs.push({ header: 'CONTATOS', dataKey: 'contatos', width: 60 });
  }
  if (options.columns.localizacao) {
    columnDefs.push({ header: 'LOCALIZAÇÃO', dataKey: 'localizacao', width: 45 });
  }
  if (options.columns.carteira) {
    columnDefs.push({ header: 'CARTEIRA', dataKey: 'carteira', width: 55 });
  }
  if (options.columns.datas) {
    columnDefs.push({ header: 'DATAS', dataKey: 'datas', width: 44 });
  }

  let totalWidth = columnDefs.reduce((sum, col) => sum + col.width, 0);

  // Redistribuir largura se não usar 269mm
  if (totalWidth < usableWidth && columnDefs.length > 0) {
    const extra = (usableWidth - totalWidth) / columnDefs.length;
    columnDefs.forEach(col => (col.width += extra));
  }

  // ========================================
  // PREPARAR DADOS DA TABELA
  // ========================================
  const tableData = sortedClients.map(client => {
    const row: Record<string, string> = {};

    if (options.columns.nomeDocumento) {
      row.cliente = `${client.nome}\n${formatCPFCNPJ(client.cpfCnpj)}`;
    }
    if (options.columns.contatos) {
      const parts: string[] = [];
      if (client.email) parts.push(client.email);
      if (client.telefone) parts.push(formatPhone(client.telefone));
      row.contatos = parts.join('\n') || '-';
    }
    if (options.columns.localizacao) {
      if (client.cidade && client.estado) {
        row.localizacao = `${client.cidade} - ${client.estado}`;
      } else if (client.cidade) {
        row.localizacao = client.cidade;
      } else if (client.estado) {
        row.localizacao = client.estado;
      } else {
        row.localizacao = '-';
      }
    }
    if (options.columns.carteira) {
      const qtde = client.qtdeApolices;
      const valor = formatCurrency(client.valorTotalPremio);
      row.carteira = `${qtde} ${qtde === 1 ? 'apólice' : 'apólices'}\n${valor}`;
    }
    if (options.columns.datas) {
      const cadastro = formatDate(client.dataCadastro);
      const nasc = client.dataNascimento ? formatDate(client.dataNascimento, false) : '-';
      row.datas = `Cad: ${cadastro}\nNasc: ${nasc}`;
    }

    return row;
  });

  // ========================================
  // CABEÇALHO
  // ========================================
  const filterText = Object.entries(options.filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => {
      const labels: Record<string, string> = {
        status: 'Status',
        tipo: 'Tipo',
        aniversariantes: 'Aniversariantes',
        busca: 'Busca',
      };
      return `${labels[k] || k}: ${v}`;
    })
    .join(' • ') || 'Todos os clientes';

  drawPDFHeader(doc, {
    title: options.title,
    subtitle: filterText,
  });

  // ========================================
  // RESUMO
  // ========================================
  const totalClientes = sortedClients.length;
  const totalPremio = sortedClients.reduce((sum, c) => sum + c.valorTotalPremio, 0);
  const totalApolices = sortedClients.reduce((sum, c) => sum + c.qtdeApolices, 0);

  doc.setFontSize(9);
  doc.setTextColor(PDF_COLORS.text.secondary);
  doc.text(
    `Total: ${totalClientes} clientes • ${totalApolices} apólices • ${formatCurrency(totalPremio)} em prêmios`,
    margin,
    45
  );

  // ========================================
  // TABELA
  // ========================================
  autoTable(doc, {
    startY: 50,
    head: [columnDefs.map(c => c.header)],
    body: tableData.map(row => columnDefs.map(c => row[c.dataKey] || '')),
    columnStyles: columnDefs.reduce((acc, col, idx) => {
      acc[idx] = { cellWidth: col.width };
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.1,
      textColor: PDF_COLORS.text.primary,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: PDF_COLORS.tableHeader,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.tableAlt,
    },
    margin: { left: margin, right: margin },
  });

  // ========================================
  // RODAPÉ
  // ========================================
  drawPDFFooter(doc);

  // ========================================
  // SALVAR
  // ========================================
  const fileName = `Relatorio_Clientes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
