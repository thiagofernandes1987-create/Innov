# Etapa 12 — Gestão de obras, planejamento e campo

## Fluxo vertical

`contrato ativo → obra → EAP → cronograma → tarefas → equipes/recursos → diário de obra → documentos/mídias → progresso no portal do cliente`

## Entregas

- carteira multiobra;
- criação de obra a partir de contrato assinado, ativo ou aditado;
- EAP hierárquica com pesos e datas;
- tarefas em Kanban, progresso, bloqueio e responsável;
- dependências FS, SS, FF e SF;
- marcos e baselines imutáveis;
- recursos, equipes e integrantes;
- diário de obra mobile;
- atividades, segurança, qualidade, atrasos e ocorrências;
- fotos, vídeos e documentos privados;
- documentos por disciplina e versões com SHA-256;
- aprovação e liberação seletiva ao cliente;
- snapshots previsto x realizado;
- portal do cliente com obras, cronograma, documentos e galeria.

## Segurança

- RLS em todas as novas tabelas;
- acesso interno por papel e membership da obra;
- cliente somente em obra própria e liberada;
- conteúdo de campo exige `client_visible` e diário aprovado;
- documento exige `client_released_at`;
- buckets `project-documents` e `daily-log-media` privados;
- URLs assinadas de 15 minutos;
- baselines e documentos liberados são imutáveis;
- auditoria para operações críticas.

## Validação

Comandos:

```bash
pnpm validate:stage12
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Próxima etapa

Etapa 13 — Qualidade, PO/FVS/FVM, não conformidades, relatórios e indicadores executivos.
