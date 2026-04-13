/**
 * Script de teste para validar parsing de OFX (formatos brasileiros).
 * Uso: npx tsx scripts/test-ofx.ts
 */

interface ParsedEntry {
    transaction_date: string;
    description: string;
    amount: number;
    reference_number?: string;
}

function parseOFX(content: string): ParsedEntry[] {
    const entries: ParsedEntry[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const txnContent = match[1];

        const dateMatch = txnContent.match(/<DTPOSTED>(\d{8})/);
        const amountMatch = txnContent.match(/<TRNAMT>([+-]?[\d.,]+)/);
        const memoMatch = txnContent.match(/<MEMO>([^<\r\n]+)/);
        const nameMatch = txnContent.match(/<NAME>([^<\r\n]+)/);
        const fitidMatch = txnContent.match(/<FITID>([^<\r\n]+)/);
        const typeMatch = txnContent.match(/<TRNTYPE>([^<\r\n]+)/);

        if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const date = new Date(
                parseInt(dateStr.substring(0, 4)),
                parseInt(dateStr.substring(4, 6)) - 1,
                parseInt(dateStr.substring(6, 8))
            );

            const amountRaw = amountMatch[1].replace(',', '.');
            const amount = parseFloat(amountRaw);
            const description = (memoMatch?.[1] || nameMatch?.[1] || typeMatch?.[1] || 'Transação OFX').trim();

            if (!isNaN(amount) && !isNaN(date.getTime())) {
                entries.push({
                    transaction_date: date.toISOString().split('T')[0],
                    description,
                    amount,
                    reference_number: fitidMatch?.[1]?.trim(),
                });
            }
        }
    }

    return entries;
}

// --- TESTES ---

const sampleOFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<DTSTART>20250101
<DTEND>20250131

<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250115120000[-3:BRT]
<TRNAMT>1500.00
<FITID>2025011500001
<NAME>TED Recebida
<MEMO>PIX Joao Silva
</STMTTRN>

<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250120
<TRNAMT>-350,50
<FITID>2025012000002
<MEMO>Pagamento Boleto Energia
</STMTTRN>

<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250125000000
<TRNAMT>-99.90
<FITID>2025012500003
</STMTTRN>

</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const results = parseOFX(sampleOFX);

console.log('=== Teste de Parsing OFX ===\n');
console.log(`Total de transações encontradas: ${results.length}\n`);

let allPassed = true;

// Teste 1: 3 transações
if (results.length !== 3) {
    console.error('❌ FAIL: Esperava 3 transações, obteve', results.length);
    allPassed = false;
} else {
    console.log('✅ PASS: 3 transações parseadas');
}

// Teste 2: primeira transação (com timezone no DTPOSTED)
const t1 = results[0];
if (t1.transaction_date !== '2025-01-15') {
    console.error('❌ FAIL: Data t1 esperada 2025-01-15, obteve', t1.transaction_date);
    allPassed = false;
} else {
    console.log('✅ PASS: DTPOSTED com timezone parseado corretamente');
}
if (t1.amount !== 1500) {
    console.error('❌ FAIL: Valor t1 esperado 1500, obteve', t1.amount);
    allPassed = false;
}
if (t1.description !== 'PIX Joao Silva') {
    console.error('❌ FAIL: Descrição t1 esperada "PIX Joao Silva", obteve', t1.description);
    allPassed = false;
} else {
    console.log('✅ PASS: MEMO priorizado sobre NAME');
}

// Teste 3: segunda transação (vírgula como decimal)
const t2 = results[1];
if (t2.amount !== -350.5) {
    console.error('❌ FAIL: Valor t2 esperado -350.5, obteve', t2.amount);
    allPassed = false;
} else {
    console.log('✅ PASS: TRNAMT com vírgula como decimal');
}

// Teste 4: terceira transação (sem MEMO/NAME, fallback TRNTYPE)
const t3 = results[2];
if (t3.description !== 'DEBIT') {
    console.error('❌ FAIL: Descrição t3 esperada "DEBIT", obteve', t3.description);
    allPassed = false;
} else {
    console.log('✅ PASS: Fallback TRNTYPE quando sem MEMO/NAME');
}
if (t3.amount !== -99.9) {
    console.error('❌ FAIL: Valor t3 esperado -99.9, obteve', t3.amount);
    allPassed = false;
}

// Teste 5: reference_number
if (t1.reference_number !== '2025011500001') {
    console.error('❌ FAIL: FITID t1 esperado "2025011500001", obteve', t1.reference_number);
    allPassed = false;
} else {
    console.log('✅ PASS: FITID extraído corretamente');
}

console.log('\n' + (allPassed ? '🎉 TODOS OS TESTES PASSARAM!' : '💥 ALGUNS TESTES FALHARAM.'));

process.exit(allPassed ? 0 : 1);
