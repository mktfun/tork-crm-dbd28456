
-- Deletar clientes criados hoje para o usuário contato@jjamorimseguros.com.br
-- Verificação: Todos têm 0 apólices vinculadas

DELETE FROM clientes 
WHERE id IN (
  'b5cb0158-9f72-4642-a4ad-e4b0a4d66e26',
  '4cb3b014-efcf-438c-8e6f-771883efeab5',
  '8d1b6360-9136-4f1a-b759-8856795f3db7',
  'ea02f02d-9350-4be2-b1c7-cda6d73f5ce1',
  '9acee241-9ad4-48f0-96c1-bcc37feb7dd5',
  '952c4b17-6c38-42d3-8067-e0147d5f6b65',
  'e54110c8-aa69-41ab-8e16-d7015db8eaee',
  'c54a2c41-e017-4b4b-9ce3-3c0256524aeb'
);
