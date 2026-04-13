-- Limpeza de dados corrompidos pela extração anterior
DELETE FROM apolices WHERE insured_asset ILIKE '%man ual%' OR policy_number ILIKE '%man%ual%';
DELETE FROM clientes WHERE name ILIKE '%MAN UAL%' OR name ILIKE '%BELLA BARDA%' OR name ILIKE '%modelo%flex%';