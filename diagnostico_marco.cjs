const { createClient } = require('@supabase/supabase-js');

// Supabase details
const supabaseUrl = 'https://lyynkfnkqjdezfggacjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eW5rZm5rcWpkZXpmZ2dhY2ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyMTU3MiwiZXhwIjoyMDkxMzk3NTcyfQ.aVJYUou1lAkkPst0OjTbiKuT76S4TXvHeuJz5yxmtO4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Buscando transações de Março 2026 ---');
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id, transaction_date, description, is_void, bank_account_id, reconciled, total_amount')
    .gte('transaction_date', '2026-03-01')
    .lte('transaction_date', '2026-03-31')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Encontradas: ${data?.length || 0} transações.`);
  if (data && data.length > 0) {
    console.table(data);
    
    // Verificando quantas não tem banco e quantas são is_void
    const unbanked = data.filter(t => !t.bank_account_id).length;
    const voided = data.filter(t => t.is_void).length;
    console.log(`Sem banco (bank_account_id is null): ${unbanked}`);
    console.log(`Anuladas (is_void = true): ${voided}`);
  }
}

run();
