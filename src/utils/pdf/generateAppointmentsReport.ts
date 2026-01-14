import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { drawPDFHeader, drawPDFFooter, PDF_COLORS } from './pdfHeader';

export interface AppointmentRow {
  id: string;
  date: string;
  time: string;
  title: string;
  status: string;
  notes: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  policyNumber: string | null;
}

export interface AppointmentsReportOptions {
  title?: string;
  notes?: string;
  groupByDay: boolean;
  showNotes: boolean;
  periodLabel?: string;
}

interface ReportPeriod {
  from: Date | undefined;
  to: Date | undefined;
}

interface ReportData {
  appointments: AppointmentRow[];
  period: ReportPeriod;
  options?: AppointmentsReportOptions;
}

// Formatar telefone no padrão brasileiro
const formatPhone = (phone: string | null): string => {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

// Agrupar agendamentos por data
const groupAppointmentsByDate = (appointments: AppointmentRow[]): Map<string, AppointmentRow[]> => {
  const grouped = new Map<string, AppointmentRow[]>();
  
  appointments.forEach(apt => {
    const dateKey = apt.date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(apt);
  });
  
  return grouped;
};

// Formatar data do dia com dia da semana
const formatDayHeader = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export const generateAppointmentsReport = async ({ 
  appointments, 
  period,
  options = { groupByDay: true, showNotes: true }
}: ReportData): Promise<void> => {
  const {
    title = 'Agenda do Dia',
    notes,
    groupByDay = true,
    showNotes = true,
    periodLabel
  } = options;

  // Ordenar cronologicamente
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  // Inicializar PDF em retrato (Portrait)
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const colors = PDF_COLORS;

  // Cabeçalho
  let yPos = drawPDFHeader(doc, {
    title,
    subtitle: periodLabel || 'AGENDA DE COMPROMISSOS',
    period
  });

  // Sumário rápido
  yPos += 8;
  const totalCount = sortedAppointments.length;
  const pendingCount = sortedAppointments.filter(a => a.status === 'Pendente').length;
  const completedCount = sortedAppointments.filter(a => a.status === 'Realizado').length;

  doc.setFontSize(8);
  doc.setTextColor(colors.text.secondary);
  doc.text(`Total: ${totalCount} compromissos`, margin, yPos);
  doc.setTextColor(colors.values.pending);
  doc.text(`• ${pendingCount} pendentes`, margin + 45, yPos);
  doc.setTextColor(colors.values.positive);
  doc.text(`• ${completedCount} realizados`, margin + 80, yPos);

  yPos += 6;
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // CONFIGURAÇÃO DE COLUNAS (Portrait = 180mm máx)
  // [ ] Hora | Compromisso | Contato
  const colWidths = {
    checkbox: 8,
    time: 16,
    details: showNotes ? 90 : 100,
    contact: showNotes ? 66 : 56
  };

  // Função para renderizar uma seção de tabela
  const renderTable = (data: AppointmentRow[], startY: number, dayHeader?: string): number => {
    // Se tiver header do dia, renderizar
    if (dayHeader && groupByDay) {
      doc.setFillColor(colors.tableHeader);
      doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
      doc.setTextColor('#ffffff');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(dayHeader.toUpperCase(), margin + 4, startY + 5.5);
      startY += 10;
    }

    const tableData = data.map(apt => {
      // Coluna 1: Checkbox visual (quadrado vazio)
      const checkbox = '☐';
      
      // Coluna 2: Hora
      const time = apt.time?.substring(0, 5) || '--:--';
      
      // Coluna 3: Detalhes do compromisso
      let details = apt.title || 'Sem título';
      if (apt.clientName) {
        details += `\n👤 ${apt.clientName}`;
      }
      if (apt.policyNumber) {
        details += ` • Apólice ${apt.policyNumber}`;
      }
      if (showNotes && apt.notes) {
        const truncatedNotes = apt.notes.length > 80 
          ? apt.notes.substring(0, 77) + '...' 
          : apt.notes;
        details += `\n📝 ${truncatedNotes}`;
      }
      
      // Coluna 4: Contato
      let contact = '';
      if (apt.clientPhone) {
        contact = `📞 ${formatPhone(apt.clientPhone)}`;
      }
      if (apt.clientEmail) {
        const email = apt.clientEmail.length > 25 
          ? apt.clientEmail.substring(0, 22) + '...' 
          : apt.clientEmail;
        contact += contact ? `\n✉ ${email}` : `✉ ${email}`;
      }
      if (!contact) {
        contact = '-';
      }

      return [checkbox, time, details, contact];
    });

    autoTable(doc, {
      startY,
      head: [['', 'HORA', 'COMPROMISSO', 'CONTATO']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        overflow: 'linebreak',
        lineColor: colors.border,
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: '#475569',
        textColor: '#ffffff',
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
      },
      bodyStyles: {
        textColor: colors.text.primary,
        minCellHeight: 12
      },
      alternateRowStyles: {
        fillColor: colors.tableAlt
      },
      columnStyles: {
        0: { 
          cellWidth: colWidths.checkbox, 
          halign: 'center', 
          valign: 'middle',
          fontSize: 14,
          fontStyle: 'normal'
        },
        1: { 
          cellWidth: colWidths.time, 
          halign: 'center', 
          fontStyle: 'bold',
          fontSize: 9
        },
        2: { 
          cellWidth: colWidths.details, 
          halign: 'left' 
        },
        3: { 
          cellWidth: colWidths.contact, 
          halign: 'left',
          fontSize: 7
        }
      },
      didParseCell: function(data) {
        // Destacar checkbox column
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.textColor = colors.text.secondary;
        }
        // Hora em destaque
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.textColor = '#1e40af';
        }
      }
    });

    return (doc as any).lastAutoTable?.finalY || startY + 50;
  };

  // Renderizar conteúdo
  if (groupByDay && sortedAppointments.length > 0) {
    // Agrupar por dia
    const grouped = groupAppointmentsByDate(sortedAppointments);
    const sortedDates = Array.from(grouped.keys()).sort();
    
    sortedDates.forEach((dateKey, index) => {
      const dayAppointments = grouped.get(dateKey)!;
      const dayHeader = formatDayHeader(dateKey);
      
      // Verificar se precisa de nova página
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos = renderTable(dayAppointments, yPos, index > 0 || sortedDates.length > 1 ? dayHeader : undefined);
      yPos += 6;
    });
  } else {
    // Sem agrupamento - tabela única
    yPos = renderTable(sortedAppointments, yPos);
  }

  // Área de anotações no final (opcional)
  const finalY = (doc as any).lastAutoTable?.finalY || yPos;
  
  if (finalY < 230) {
    const notesAreaY = finalY + 12;
    
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.3);
    doc.line(margin, notesAreaY, pageWidth - margin, notesAreaY);
    
    doc.setFontSize(8);
    doc.setTextColor(colors.text.secondary);
    doc.setFont('helvetica', 'bold');
    doc.text('ANOTAÇÕES', margin, notesAreaY + 6);
    
    // Linhas pontilhadas para anotações manuais
    doc.setDrawColor(colors.border);
    doc.setLineDashPattern([1, 1], 0);
    for (let i = 0; i < 4; i++) {
      const lineY = notesAreaY + 14 + (i * 8);
      if (lineY < 270) {
        doc.line(margin, lineY, pageWidth - margin, lineY);
      }
    }
    doc.setLineDashPattern([], 0);
  }

  // Observações personalizadas do usuário
  if (notes && notes.trim()) {
    const currentFinalY = (doc as any).lastAutoTable?.finalY || 200;
    
    if (currentFinalY < 250) {
      doc.setFontSize(7);
      doc.setTextColor(colors.text.secondary);
      doc.setFont('helvetica', 'italic');
      const splitNotes = doc.splitTextToSize(`Obs: ${notes.trim()}`, pageWidth - margin * 2);
      doc.text(splitNotes, margin, currentFinalY + 30);
    }
  }

  // Rodapé em todas as páginas
  drawPDFFooter(doc);

  // Salvar arquivo
  const dateStr = period.from 
    ? format(period.from, 'dd-MM-yyyy', { locale: ptBR })
    : format(new Date(), 'dd-MM-yyyy', { locale: ptBR });
  const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const fileName = `Agenda_${safeTitle}_${dateStr}.pdf`;
  
  doc.save(fileName);
};
