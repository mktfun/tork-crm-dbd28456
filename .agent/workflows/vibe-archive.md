---
description: Arquivar especificações de código implementadas e limpar o diretório de trabalho.
---

<!-- OPENSPEC:START -->

**Guardrails**

- Só rode este workflow se todas as tarefas em `specs/<id>/tasks.md` estiverem concluídas.
- Não apague arquivos de código-fonte, apenas mova artefatos de documentação.

**Steps**

1. Peça confirmação ao usuário sobre qual `<id>` de spec será arquivado caso não tenha sido explicitamente fornecido.
2. Certifique-se de que a funcionalidade foi validada e implementada com sucesso.
3. Mova o diretório inteiro de `specs/<id>/` para `specs/archive/<id>/`.
4. Adicione uma nota em um arquivo `CHANGELOG.md` ou equivalente na raiz do projeto listando que a implementação `<id>` foi finalizada na data atual.

**Reference**

- Isso mantém a raiz da pasta `specs/` limpa contendo apenas trabalhos em andamento ou futuros.
<!-- OPENSPEC:END -->
