-- Expurgo do contato da base de clientes para não puxar prioridade de SDR em frente à privilégios de Admin Mode
DELETE FROM clientes WHERE phone LIKE '%979699832%';
