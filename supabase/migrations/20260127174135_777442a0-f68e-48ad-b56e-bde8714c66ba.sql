-- Limpeza preventiva dos dados corrompidos pelo OCR
-- Remove apólices com número "man ual" (lixo de OCR)
DELETE FROM apolices WHERE policy_number = 'man ual' OR policy_number ILIKE '%manual%';

-- Remove clientes com nomes corrompidos
DELETE FROM clientes WHERE 
  name ILIKE '%bella barda%modelo%' 
  OR name ILIKE '%man ual%' 
  OR name = 'man ual'
  OR name ILIKE '%modelo flex%'
  OR name ILIKE '%modelo turbo%';