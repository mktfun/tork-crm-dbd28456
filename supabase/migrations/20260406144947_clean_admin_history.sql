-- Deleta histórico vazado com o prompt admin por falso positivo do tenant
DELETE FROM admin_chat_history 
WHERE phone_number LIKE '%956076123%';
