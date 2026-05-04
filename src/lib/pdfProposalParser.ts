import * as pdfjsLib from 'pdfjs-dist';
import { ProposalOption } from '@/types';

// We need to set the worker path for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedProposal {
  options: Partial<ProposalOption>[];
  client_name?: string;
}

export async function parsePDFLocalFallback(file: File): Promise<ParsedProposal> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    const options = extractOptionsFromText(fullText);
    const clientName = extractClientName(fullText);

    return {
      options,
      client_name: clientName
    };
  } catch (error) {
    console.error('Error parsing PDF locally:', error);
    throw error;
  }
}

function extractOptionsFromText(text: string): Partial<ProposalOption>[] {
  const options: Partial<ProposalOption>[] = [];
  const lowerText = text.toLowerCase();
  
  // Heurísticas básicas para identificar Seguradoras
  const insurers = [
    { name: 'Porto Seguro', keys: ['porto', 'porto seguro'] },
    { name: 'Azul Seguros', keys: ['azul'] },
    { name: 'Suhai', keys: ['suhai'] },
    { name: 'HDI', keys: ['hdi'] },
    { name: 'Tokio Marine', keys: ['tokio', 'tokio marine'] },
    { name: 'Allianz', keys: ['allianz'] },
    { name: 'Bradesco Seguros', keys: ['bradesco'] },
    { name: 'Mapfre', keys: ['mapfre'] },
    { name: 'Liberty', keys: ['liberty'] },
    { name: 'Aliro', keys: ['aliro'] },
    { name: 'Sancor', keys: ['sancor'] },
    { name: 'Mitsui', keys: ['mitsui', 'mitsui sumitomo'] },
    { name: 'Zurich', keys: ['zurich'] },
  ];

  // Identificar seguradoras presentes no texto (simples contagem/presença)
  const foundInsurers: string[] = [];
  insurers.forEach(insurer => {
    if (insurer.keys.some(k => lowerText.includes(k))) {
      foundInsurers.push(insurer.name);
    }
  });

  // Procurar por valores (R$ X.XXX,XX)
  const priceRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const matches = [...text.matchAll(priceRegex)];
  
  const prices = matches.map(m => {
    // Converter "2.500,00" para 2500.00
    const val = m[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(val);
  }).filter(p => p > 100); // Filtrar valores muito baixos que não são prêmio
  
  // Dedup e sort
  const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);

  // Criar opções baseadas no que encontramos (Fallback rudimentar)
  // Limitar a 3 opções
  const maxOptions = Math.min(3, Math.max(foundInsurers.length, uniquePrices.length, 1));
  
  for (let i = 0; i < maxOptions; i++) {
    const option: Partial<ProposalOption> = {
      insurer_name: foundInsurers[i] || 'Seguradora a definir',
      plan_name: 'Plano Básico',
      price_annual: uniquePrices[i] || undefined,
      price_monthly: uniquePrices[i] ? uniquePrices[i] / 10 : undefined, // Assumir 10x como base
      coverage_items: ['Cobertura Básica', 'Danos Materiais', 'Danos Corporais', 'Assistência 24h'],
      is_recommended: i === 0
    };
    options.push(option);
  }

  return options;
}

function extractClientName(text: string): string | undefined {
  // Procura por "Nome:", "Segurado:", "Cliente:" e pega a próxima linha ou texto
  const nameRegex = /(?:Segurado|Cliente|Proponente|Nome)(?:\s*:|\s+-)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
  const match = text.match(nameRegex);
  return match ? match[1].trim() : undefined;
}
