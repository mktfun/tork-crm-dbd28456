# Guia de Commits para Changelog Automático

Para garantir a geração automática de changelogs, use os seguintes prefixos nos commits:

## Tipos de Commit

### Features (Nova Funcionalidade)
```
feat: adicionar sistema de backup automático
feature: implementar chat em tempo real
```

### Bug Fixes (Correções)
```
fix: corrigir erro de login
bugfix: resolver problema de sincronização
```

### Improvements (Melhorias)
```
improvement: otimizar performance do dashboard
enhance: melhorar interface do usuário
```

### Breaking Changes (Mudanças Importantes)
```
breaking: atualizar API para v3
BREAKING: remover suporte para versões antigas
```

## Exemplos de Uso

### Commit de Feature
```bash
git commit -m "feat: adicionar sistema de notificações push"
```
- Gera: Categoria "feature", Prioridade "medium"
- Aumenta versão minor (v2.1.0 → v2.2.0)

### Commit de Fix
```bash
git commit -m "fix: corrigir vazamento de memória no dashboard"
```
- Gera: Categoria "bugfix", Prioridade "high" 
- Aumenta versão patch (v2.1.0 → v2.1.1)

### Commit de Breaking Change
```bash
git commit -m "breaking: migrar banco de dados para nova estrutura"
```
- Gera: Categoria "breaking", Prioridade "critical"
- Aumenta versão major (v2.1.0 → v3.0.0)

## Processo Automático

1. **Push para main** → Dispara GitHub Action
2. **Análise de commits** → Determina tipo de mudança e versão
3. **Geração de changelog** → Cria entrada automaticamente
4. **Tag de versão** → Marca release no Git
5. **Publicação** → Usuários veem na página de Novidades

## Observações

- Commits sem prefixo são tratados como "improvement"
- Múltiplos commits geram uma entrada consolidada
- O sistema ignora merges automáticos
- Versões duplicadas são ignoradas automaticamente