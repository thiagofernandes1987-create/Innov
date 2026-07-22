# Etapa 20 — Backup e restauração

## Estado

**Infraestrutura versionada; execução depende de origem e destino Supabase distintos configurados no ambiente `homologation`.**

## Objetivo

Comprovar que os schemas de aplicação e o ledger de migrations podem ser extraídos da origem e restaurados em um projeto Supabase descartável, sem publicar o dump como artefato.

## Escopo incluído

- dump lógico em formato custom;
- schemas `public` e `supabase_migrations`;
- hash SHA-256 e contagem de objetos;
- destino destrutivo explicitamente confirmado;
- restauração em projeto diferente da origem;
- comparação estrutural e de dados-chave;
- smoke tests de módulos, estoque, auditoria e RLS;
- medição observada do tempo de restauração;
- remoção segura do dump efêmero;
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

Origem e destino não podem apontar para o mesmo host, porta e banco.

## Fluxo

```text
validar secrets
→ confirmar destino descartável
→ snapshot da origem
→ pg_dump custom
→ SHA-256 e pg_restore --list
→ reset dos schemas no destino
→ pg_restore
→ ANALYZE
→ snapshot do destino
→ comparação
→ smoke tests
→ apagar dump
→ publicar somente relatório JSON
```

## Segurança

- URLs de banco nunca são gravadas no relatório;
- fingerprints são hashes truncados dos endpoints;
- senhas são fornecidas por variáveis `PG*` e não por argumentos de linha de comando;
- dump recebe permissão `0600`;
- dump não é enviado ao GitHub;
- arquivo é sobrescrito e removido no `finally`;
- o destino precisa ser diferente da origem;
- restauração destrutiva exige confirmação explícita;
- workflow executa somente no ambiente protegido.

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
- [x] relatório inicial resiliente;
- [x] origem e destino iguais são bloqueados;
- [x] confirmação destrutiva obrigatória;
- [x] dump não é enviado como artefato;
- [x] remoção do dump implementada;
- [ ] três secrets configurados;
- [ ] dump executado;
- [ ] restauração isolada executada;
- [ ] snapshots equivalentes;
- [ ] smoke tests aprovados;
- [ ] RTO observado registrado;
- [ ] workflow verde;
- [ ] estratégia de retenção durável definida antes da produção.

## Limitações

Este drill comprova restauração lógica da aplicação em um projeto Supabase descartável. A recuperação completa continua exigindo procedimentos separados para buckets, Auth, DNS, providers e backups gerenciados.
