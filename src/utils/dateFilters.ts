
// Utilitário para filtros de data - Vamos resolver o bug aqui
export function getDateRange(filter: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log('🔍 Calculando range para filtro:', filter);
  console.log('📅 Data/hora atual:', now.toISOString());
  
  switch (filter) {
    case 'current-month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📊 Filtro "Este Mês":');
      console.log('- Início:', startOfMonth.toISOString());
      console.log('- Fim:', endOfMonth.toISOString());
      
      return { start: startOfMonth, end: endOfMonth };
    }
    
    case 'next-30-days': {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
      
      console.log('📊 Filtro "Próximos 30 dias":');
      console.log('- Início:', startOfToday.toISOString());
      console.log('- Fim:', end.toISOString());
      
      return { start: startOfToday, end };
    }
    
    case 'next-90-days': {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 90);
      end.setHours(23, 59, 59, 999);
      
      console.log('📊 Filtro "Próximos 90 dias":');
      console.log('- Início:', startOfToday.toISOString());
      console.log('- Fim:', end.toISOString());
      
      return { start: startOfToday, end };
    }
    
    case 'expired': {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      
      console.log('📊 Filtro "Vencidas":');
      console.log('- Fim (ontem):', yesterday.toISOString());
      
      return { start: null, end: yesterday };
    }
    
    default:
      console.log('📊 Filtro "Todas" - sem restrição de data');
      return { start: null, end: null };
  }
}

export function isDateInRange(date: string | Date, filter: string): boolean {
  const { start, end } = getDateRange(filter);
  const targetDate = new Date(date);
  
  console.log('🔍 Verificando se data', targetDate.toISOString(), 'está no range do filtro', filter);
  
  if (filter === 'all') {
    console.log('✅ Filtro "all" - sempre true');
    return true;
  }
  
  if (start && targetDate < start) {
    console.log('❌ Data anterior ao início do range');
    return false;
  }
  
  if (end && targetDate > end) {
    console.log('❌ Data posterior ao fim do range');
    return false;
  }
  
  console.log('✅ Data está no range');
  return true;
}
