# Etapa 20 — Backup e restauração

## Estado

**Drill lógico aprovado em ambiente `homologation` com origem e destino Supabase distintos.**

A evidência valida a restauração dos schemas de aplicação e do ledger. A política de retenção durável, PITR, buckets e Supabase Auth continuam pendentes antes de produção.

## Objetivo

Comprovar que os schemas de aplicação e o ledger de migrations podem ser extraídos da origem e restaurados em um projeto Supabase descartável, sem publicar o dump como artefato.

## Escopo incluído

- dump lógico em formato custom;
- schemas `public` e `supabase_migrations`;
- hash SHA-256 e contagem de objetos;
- destino destrutivo explicitamente confirmado;
- restauração em ambiente isolado, diferente da origem;
- comparação estrutural e de dados-chave;
- smoke tests de módulos, estoque, auditoria e RLS;
- medição observada do tempo de restauração;
- remoção segura do dump e da lista de restauração;
- artefato contendo apenas evidência JSON.

## Fora do escopo

- conteúdo binário dos buckets;
- usuários e sessões do Supabase Auth;
- DNS;
- credenciais de providers;
- retenção durável do backup;
- PITR gerenciado pelo provider;
- restauração em produção;
- declaração de RPO/RTO contratual sem medições adicionais.

## Pré-requisitos

Secrets do ambiente `homologation`:

```text
SUPABASE_DB_URL
SUPABASE_RESTORE_DB_URL
SUPABASE_RESTORE_CONFIRMATION
```

O terceiro valor deve ser exatamente:

```text
STAGE20_DISPOSABLE_RESTORE
```

No Session pooler, origem e destino podem compartilhar host, porta e banco `postgres`; a identidade segura inclui também o usuário `postgres.<project-ref>`.

## Fluxo

```text
validar secrets
→ confirmar destino descartável
→ identificar projetos pelo endpoint e project ref
→ snapshot da origem
→ pg_dump custom com cliente PostgreSQL 17
→ SHA-256 e pg_restore --list
→ omitir apenas FKs para schemas externos ao escopo
→ omitir DEFAULT ACLs de roles gerenciadas pelo provider
→ reset dos schemas no destino
→ pg_restore
→ ANALYZE
→ snapshot do destino
→ comparação
→ smoke tests
→ apagar dump e lista de restauração
→ publicar somente relatório JSON
```

## Segurança

- URLs de banco nunca são gravadas no relatório;
- fingerprints são hashes truncados das identidades dos bancos;
- senhas são fornecidas por variáveis `PG*` e não por argumentos de linha de comando;
- dump e lista de restauração recebem permissão `0600`;
- dump não é enviado ao GitHub;
- arquivos temporários são sobrescritos e removidos no `finally`;
- o destino precisa ser diferente da origem;
- restauração destrutiva exige confirmação explícita;
- workflow executa somente no ambiente protegido;
- Auth não é copiado para o projeto descartável;
- FKs externas omitidas são contabilizadas no relatório;
- `DEFAULT ACLs` de roles gerenciadas pelo Supabase são contabilizadas e não alteradas.

## Verificações

A origem e o destino são comparados nos campos:

- quantidade de tabelas públicas;
- tabelas com RLS;
- funções públicas;
- quantidade de migrations;
- última migration;
- módulos cadastrados;
- organizações;
- itens de estoque;
- eventos de auditoria.

Smoke tests:

- registro de módulos disponível;
- schema de estoque disponível;
- schema de auditoria disponível;
- ao menos uma tabela pública com RLS.

## Evidência aprovada

- workflow: `29911179764`;
- job: `88894215296`;
- artefato: `8526039714`;
- status: `passed`;
- PostgreSQL cliente: `17.10`;
- origem e destino distintos: aprovado;
- tabelas públicas: `144` em ambos;
- tabelas com RLS: `144` em ambos;
- funções públicas: `196` em ambos;
- migrations: `143` em ambos;
- última migration: `20260721221145` em ambos;
- dump: `1.812.078` bytes;
- objetos no dump: `2.798`;
- SHA-256: `c5256ec8018996475dcbb7cf8c52a4eaf9dc5f95c6c0cabc988c2fdc8df2d2b5`;
- FKs externas ao escopo Auth: `139`, registradas e omitidas;
- `DEFAULT ACLs` gerenciadas pelo provider: `6`, registradas e omitidas;
- duração do dump: `38.400 ms`;
- duração da restauração: `200.950 ms`;
- RTO observado: `201 segundos`;
- diferenças entre snapshots: zero;
- smoke tests: todos aprovados;
- dump removido: sim;
- lista de restauração removida: sim.

## Arquivos

```text
scripts/run-stage20-backup-restore-drill.mjs
.github/workflows/stage20-backup-restore-drill.yml
stage20-backup-restore-report.json  # somente artefato
```

## Artefatos

Permitido:

```text
stage20-backup-restore-report.json
```

Proibido:

```text
*.dump
*.sql contendo dados
URLs de conexão
senhas
```

## Critério de conclusão

- [x] script versionado;
- [x] workflow protegido versionado;
- [x] relatório resiliente;
- [x] origem e destino iguais são bloqueados;
- [x] Session pooler diferencia projetos pelo project ref;
- [x] confirmação destrutiva obrigatória;
- [x] cliente PostgreSQL compatível com o servidor;
- [x] dump não é enviado como artefato;
- [x] remoção do dump implementada;
- [x] três secrets configurados;
- [x] dump executado;
- [x] restauração isolada executada;
- [x] snapshots equivalentes;
- [x] smoke tests aprovados;
- [x] RTO observado registrado;
- [x] workflow verde;
- [ ] estratégia de retenção durável definida antes da produção;
- [ ] recuperação de buckets validada;
- [ ] estratégia de recuperação do Supabase Auth definida;
- [ ] PITR e política do provider contratualmente definidos.

## Limitações

Este drill comprova restauração lógica da aplicação em um projeto Supabase descartável. A recuperação completa continua exigindo procedimentos separados para buckets, Auth, DNS, providers, retenção durável e backups gerenciados.
