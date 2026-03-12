-- Adicionar changelogs históricos faltantes para funcionalidades já implementadas

INSERT INTO changelogs (id, version, title, description, category, priority, is_published, created_at, updated_at) VALUES
(gen_random_uuid(), 'v1.3.1', 'Sistema de Deduplicação de Clientes', 'Implementado sistema automático de detecção e correção de clientes duplicados com relatórios detalhados e opções de mesclagem.', 'improvement', 'high', true, '2024-01-15 10:00:00+00', '2024-01-15 10:00:00+00'),

(gen_random_uuid(), 'v1.4.2', 'Importação em Massa de Clientes', 'Adicionada funcionalidade de importação de clientes via CSV com validação automática e mapeamento de colunas personalizável.', 'feature', 'high', true, '2024-02-01 10:00:00+00', '2024-02-01 10:00:00+00'),

(gen_random_uuid(), 'v1.5.1', 'Gestão Avançada de Configurações', 'Implementado painel completo para gerenciar Ramos, Seguradoras, Produtores, Corretoras e Tipos de Transação com operações CRUD completas.', 'feature', 'medium', true, '2024-02-15 10:00:00+00', '2024-02-15 10:00:00+00'),

(gen_random_uuid(), 'v1.6.1', 'Sistema de Parcelas e Baixas Parciais', 'Adicionado controle detalhado de parcelas com opções de baixa parcial, histórico de pagamentos e gestão de pendências.', 'improvement', 'medium', true, '2024-03-01 10:00:00+00', '2024-03-01 10:00:00+00'),

(gen_random_uuid(), 'v1.7.1', 'Validação Automática de Dados', 'Implementada validação em tempo real de CPF/CNPJ, CEP e outros campos críticos com feedback visual imediato.', 'improvement', 'medium', true, '2024-03-15 10:00:00+00', '2024-03-15 10:00:00+00'),

(gen_random_uuid(), 'v1.8.1', 'Exportação de Relatórios Avançados', 'Adicionadas opções de exportação de relatórios em múltiplos formatos (PDF, Excel) com filtros personalizáveis.', 'feature', 'low', true, '2024-04-01 10:00:00+00', '2024-04-01 10:00:00+00'),

(gen_random_uuid(), 'v1.9.1', 'Integração com APIs Externas', 'Implementada integração com serviços externos para consulta de CEP, validação de documentos e outros serviços úteis.', 'improvement', 'low', true, '2024-04-15 10:00:00+00', '2024-04-15 10:00:00+00');