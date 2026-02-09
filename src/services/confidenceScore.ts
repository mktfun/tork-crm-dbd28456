/**
 * Calcula score de confiança baseado na completude dos dados extraídos
 * Retorna valor de 0 a 100
 */
export function calculateConfidenceScore(item: any): number {
    let score = 0;
    let maxScore = 0;

    // Cliente (30 pontos)
    maxScore += 30;
    if (item.clientId) score += 15; // Cliente identificado
    if (item.clientCpfCnpj && item.clientCpfCnpj.length >= 11) score += 10; // CPF/CNPJ válido
    if (item.clientName && item.clientName !== 'Cliente Não Identificado') score += 5;

    // Seguradora (20 pontos)
    maxScore += 20;
    if (item.seguradoraId) score += 20;

    // Ramo (15 pontos)
    maxScore += 15;
    if (item.ramoId) score += 15;

    // Apólice (15 pontos)
    maxScore += 15;
    if (item.numeroApolice && item.numeroApolice.length > 3) score += 15;

    // Datas (10 pontos)
    maxScore += 10;
    if (item.dataInicio && item.dataFim) score += 10;

    // Prêmio (10 pontos)
    maxScore += 10;
    if (item.premioLiquido && item.premioLiquido > 0) score += 10;

    // Normaliza para 0-100
    const normalized = Math.round((score / maxScore) * 100);

    return Math.min(100, Math.max(0, normalized));
}

/**
 * Retorna badge visual baseado no score
 */
export function getConfidenceBadge(score: number): {
    emoji: string;
    color: string;
    label: string;
    bgColor: string;
} {
    if (score >= 95) {
        return {
            emoji: '🟢',
            color: 'text-green-600',
            label: 'Excelente',
            bgColor: 'bg-green-50 border-green-200'
        };
    } else if (score >= 70) {
        return {
            emoji: '🟡',
            color: 'text-yellow-600',
            label: 'Revisar',
            bgColor: 'bg-yellow-50 border-yellow-200'
        };
    } else {
        return {
            emoji: '🔴',
            color: 'text-red-600',
            label: 'Atenção',
            bgColor: 'bg-red-50 border-red-200'
        };
    }
}
