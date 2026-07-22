# Etapa 20 — Prontidão de Produção

## Estado

**Em implementação, com UI/UX Pro Max, concorrência de estoque, restauração lógica e integração de anexos protegidos aprovadas na branch.**  
Branch: `feature/etapa-20-prontidao-producao`  
PR: `#23`, em rascunho  
Produção: não liberada

O provider ClamAV real, a migration de anexos e o E2E do SAC ainda não foram homologados.

## Objetivo

Preparar a Innovar Platform para uma futura publicação controlada, sem confundir implementação em branch, homologação técnica e liberação produtiva.

## Escopo incluído

- governança pós-merge e manifesto verificável;
- UI/UX Pro Max como diretriz permanente;
- concorrência real de estoque;
- backup e restauração em ambiente isolado;
- quarentena e antimalware de anexos;
- provider jurídico;
- telemetria, retenção e incidentes;
- hardening de Auth e segurança externa;
- carga, rollback e decisão formal de go-live.

## Fora do escopo

- publicação automática em produção;
- declaração de prontidão sem evidências;
- mistura de dados reais com fixtures;
- armazenamento de secrets no Git;
- bypass de segurança para manter funcionalidades disponíveis;
- WMS avançado, reservado à Etapa 21.

## Fluxos

```text
branch funcional
→ CI completo
→ evidência específica
→ configuração externa protegida
→ migration e aplicação coordenadas
→ homologação autenticada
→ revisão de riscos
→ decisão GO, NO_GO ou CONDITIONAL_GO
→ publicação controlada
```

### Anexo protegido

```text
sessão autorizada
→ MIME, tamanho, nome e assinatura dos bytes
→ quarentena privada
→ ClamAV INSTREAM
→ CLEAN: promoção e registro com evidência
→ BLOCKED/ERROR: fail-closed
→ download autenticado e sem cache
```

## Modelo de dados

A Etapa 20 evita criar estado persistido sem necessidade. As alterações persistentes atuais são:

- manifesto `diretrizes/ESTADO-ATUAL.json`;
- campos de segurança dos anexos do SAC:
  - `security_status`;
  - `security_scan_id`;
  - `security_provider`;
  - `security_scanned_at`.

Anexos anteriores são classificados como `LEGACY`, sem atribuir análise antimalware retroativa.

## Rotas

Rotas revisadas nesta etapa:

- `/app` — dashboard e shell UI/UX Pro Max;
- `/app/ocorrencias/[id]` — anexos internos com estado de segurança;
- `/cliente/ocorrencias/[id]` — anexos liberados após `CLEAN`;
- `/api/sac/attachments/[id]` — download autenticado, assinado, sem cache e protegido pelo estado do scan.

## RPCs e integrações

- `post_inventory_movement` — concorrência real homologada;
- `register_sac_ticket_attachment` — nova assinatura exige evidência antimalware;
- Supabase Storage — quarentena privada e bucket funcional privado;
- ClamAV `INSTREAM` — integração implementada na branch;
- provider ClamAV real — ainda pendente em homologação;
- provider jurídico — ainda pendente.

Toda integração deve possuir timeout, comportamento fail-closed ou fallback explícito, idempotência, sanitização, health check, auditoria e procedimento de indisponibilidade.

## Segurança e RLS

- autorização permanece no banco e no servidor;
- nenhuma policy foi flexibilizada;
- nenhuma RPC operacional é concedida a `anon`;
- Service Role não é exposta ao cliente;
- anexos são lidos pelo usuário somente após RLS autorizar o registro;
- portal recebe somente arquivos `CLEAN`;
- equipe autorizada pode identificar arquivos `LEGACY` para futura reanálise;
- scanner indisponível resulta em fail-closed;
- arquivo detectado não é promovido;
- falha de registro remove objeto promovido;
- produção permanece bloqueada.

## Storage

Buckets funcionais privados permanecem preservados. A Etapa 20 adiciona o contrato do bucket:

```text
file-quarantine
```

Prefixos:

```text
pending/<organization>/<scanId>/
blocked/<organization>/<scanId>/
results/<organization>/<scanId>.json
```

Nenhum payload de quarentena é publicado como artefato de CI.

## UI/UX Pro Max

A direção visual permanente é **Arquitetura em operação**:

- azul profundo, cobre e materiais naturais;
- densidade operacional com leitura clara;
- WCAG 2.2 AA como meta;
- foco visível;
- alvos mínimos de 44×44 px;
- reflow e responsividade;
- forced colors;
- redução de movimento;
- estados expressos por texto e semântica, não apenas cor;
- proibição de presets SaaS genéricos rosa/fúcsia.

No fluxo de anexos, a ação passou a ser **Analisar e enviar**, com estados `Legado não analisado` e `Arquivo liberado` visíveis.

## Migrations

Migration versionada nesta frente:

```text
20260722104500_stage20_sac_attachment_security.sql
```

Estado atual:

```text
versionada na branch
não aplicada em homologação
não aplicada em produção
```

A migration altera a assinatura da RPC do SAC. Por isso, aplicação e código devem ser promovidos de forma coordenada somente depois do provider real estar saudável.

## Testes

### CI completo

```text
run: 29913636056
status: passed
```

Inclui documentação, vacinas, ledger, validadores das Etapas 17–20, lint, typecheck, testes TypeScript/Python e build.

### Concorrência de estoque

```text
run: 29889168656
artifact: 8517620520
status: passed
cleanup: passed
```

### Backup e restauração

```text
run: 29911179764
artifact: 8526039714
status: passed
RTO observado: 201 segundos
diferenças: 0
```

### ClamAV local

```text
run: 29913636268
job: 88902223114
artifact: 8526935275
status: passed
PING: passed
fixture limpa: CLEAN
EICAR: BLOCKED
```

## Homologação

Concluído:

- concorrência real do estoque;
- backup e restauração lógica em projeto descartável;
- protocolo ClamAV local com fixture limpa e EICAR;
- CI completo da integração de anexos na branch.

Pendente:

- endpoint ClamAV privado acessível ao runtime;
- health check do provider real;
- migration e aplicação coordenadas;
- upload limpo e EICAR pelo fluxo real do SAC;
- reanálise dos anexos `LEGACY`;
- integração dos outros módulos.

## Vacinas aplicadas ou criadas

- `VACINA-012` — estado pós-merge;
- `VACINA-013` — fixtures respeitam fronteiras sensíveis;
- princípios existentes de fail-closed, menor privilégio, segredo fora do Git e histórico imutável permanecem obrigatórios.

## Limitações iniciais

- o scan é síncrono e pode aumentar a latência do upload;
- limite inicial de 25 MB;
- provider real não provisionado;
- não há interface administrativa de quarentena;
- não há reprocessamento assíncrono;
- anexos `LEGACY` não foram analisados;
- retenção jurídica e remoção programada ainda pendentes;
- outros módulos ainda usam seus fluxos anteriores.

## Próximos passos

1. provisionar ClamAV privado;
2. cadastrar `CLAMAV_HOST` no ambiente `homologation`;
3. executar `Stage 20 File Security Provider Health`;
4. aplicar migration e aplicação de forma coordenada;
5. executar E2E real do SAC;
6. definir reanálise de anexos `LEGACY`;
7. expandir a proteção aos demais módulos;
8. seguir para provider jurídico, telemetria, Auth, carga, pentest e go-live.

## Definition of Done

- [x] governança e manifesto;
- [x] UI/UX Pro Max permanente;
- [x] concorrência real de estoque;
- [x] backup e restauração lógica;
- [x] fundação de quarentena e antimalware;
- [x] integração do SAC na branch;
- [x] E2E local ClamAV limpo/EICAR;
- [x] CI completo da branch;
- [ ] provider ClamAV real saudável;
- [ ] migration e aplicação homologadas;
- [ ] E2E real do SAC;
- [ ] anexos legados tratados;
- [ ] demais módulos protegidos;
- [ ] provider jurídico;
- [ ] telemetria e retenção;
- [ ] MFA e credenciais;
- [ ] carga prolongada;
- [ ] pentest e revisões externas;
- [ ] decisão de publicação;
- [ ] CI final de toda a Etapa 20;
- [ ] merge somente após aprovação explícita.
