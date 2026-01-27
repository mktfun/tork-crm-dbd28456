-- Excluir clientes "lixo" criados hoje (27/01/2026)
DELETE FROM clientes 
WHERE id IN (
  'ae963f34-d085-4cde-a1d7-5a544901f9fa',  -- Auane Bella Barda Modelo
  'd95d55a0-44d9-4804-9bf2-48922920b4e6'   -- Yasmim Paes Souerra Modelo
);