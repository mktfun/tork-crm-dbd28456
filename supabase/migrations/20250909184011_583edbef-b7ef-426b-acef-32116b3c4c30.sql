-- Limpar dados históricos incorretos (datas de 2024 quando projeto começou há 2 meses)
DELETE FROM changelogs WHERE created_at < '2024-12-01';

-- Atualizar package.json version para começar versionamento automático
-- Inserir changelog inicial para marcar o início do versionamento automático
INSERT INTO changelogs (
  version,
  title,
  description,
  category,
  priority,
  is_published,
  created_at
) VALUES (
  'v2.1.0',
  'Sistema de Changelog Automático Implementado',
  'Implementação completa de automação de changelog integrada ao CI/CD com GitHub Actions. A partir desta versão, todas as atualizações serão automaticamente documentadas baseadas nos commits do repositório.',
  'feature',
  'high',
  true,
  now()
);