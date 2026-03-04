---
name: task-breakdown-creation
description: Quebrar escopos em tasks de implementação e criar tasks em GitHub Issues, Linear ou arquivos Markdown locais. Use quando o usuário pedir planejamento executável com ordem de implementação, identificação de tarefas paralelizáveis, regras de tamanho (nem pequenas demais nem grandes demais), independência entre tasks e criação efetiva das tasks no destino escolhido.
---

# Task Breakdown And Creation

## Objetivo

Transformar um pedido em um conjunto de tasks implementáveis, independentes e priorizadas, com indicação explícita de:
- o que deve ser feito primeiro
- o que pode rodar em paralelo
- onde cada task será criada (GitHub, Linear ou arquivo local `.md`)

## Regras Obrigatórias

1. Criar tasks independentes por padrão.
2. Evitar tasks pequenas demais:
   - Não criar task que represente menos de 1 hora de trabalho real.
   - Fundir tarefas triviais com a task adjacente mais próxima.
3. Evitar tasks grandes demais:
   - Não criar task que provavelmente passe de 1 dia de trabalho individual.
   - Quebrar tasks com múltiplos objetivos em subtasks independentes.
4. Definir dependências explícitas:
   - Se houver dependência, marcar qual task desbloqueia a próxima.
5. Definir paralelismo explícito:
   - Marcar com grupos `Parallel Group` (A, B, C...) as tasks que podem rodar ao mesmo tempo.
6. Toda task deve seguir o template em `references/task-template.md`.
7. Nunca criar task sem critério de aceite verificável.

## Fluxo

1. Entender escopo, restrições e resultado esperado.
2. Propor blocos de trabalho por entrega técnica (não por camada isolada).
3. Validar tamanho de cada bloco (1h a 1 dia).
4. Validar independência entre blocos.
5. Definir prioridade:
   - `P0`: desbloqueia outras tasks ou reduz maior risco.
   - `P1`: implementação principal.
   - `P2`: acabamento, observabilidade, documentação complementar.
6. Definir execução:
   - `Sequential`: depende de outra task.
   - `Parallel`: sem dependência de código/decisão.
7. Criar as tasks no destino solicitado.

## Saída de Planejamento

Sempre apresentar uma tabela resumo antes de criar tasks:

| ID | Título | Prioridade | Dependências | Parallel Group | Tamanho |
|----|--------|------------|--------------|----------------|---------|

Depois da tabela, informar:
- **Implementar primeiro:** lista ordenada das tasks iniciais (`P0`).
- **Podem rodar em paralelo:** grupos de tasks por `Parallel Group`.

## Criação em Cada Destino

### 1) Arquivos locais (Markdown)

Criar um arquivo por task em `.tasks/` com nome:
`YYYY-MM-DD-<id>-<slug>.md`

Usar exatamente o template `references/task-template.md`.

### 2) Linear

Criar via MCP (`linear__create_issue`) preenchendo:
- `title`
- `description` (conteúdo do template)
- `priority` conforme mapeamento:
  - `P0` -> `1`
  - `P1` -> `2`
  - `P2` -> `3`

Se houver projeto/equipe informados, preencher `project` e `team`.

### 3) GitHub

Criar via MCP (`github__issue_write` com `method: create`) ou `gh issue create`.

Campos mínimos:
- título
- corpo com template completo
- labels (quando disponíveis): `task`, `priority:P0|P1|P2`, `parallel:A|B|C`, `depends-on:<ID>`

## Template Obrigatório

Ler e aplicar `references/task-template.md` para todas as tasks.

## Checklist Final

Antes de finalizar, confirmar:
- Todas as tasks estão no intervalo de tamanho adequado.
- Não há task com dois objetivos desconexos.
- Dependências e paralelismo estão explícitos.
- Está claro o que vem primeiro.
- Todas foram criadas no destino solicitado.
