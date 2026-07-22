# Etapa 20 — Prontidão de Produção

## Estado

**Em implementação, com fundação UI/UX e concorrência real de estoque homologadas.**  
Branch: `feature/etapa-20-prontidao-producao`  
PR: `#23`, em rascunho  
Base empilhada: `chore/encerramento-etapa-19` / PR `#22`  
Versão atual: `0.19.0`  
Produção: não liberada

## Objetivo

Transformar a plataforma tecnicamente homologada em uma solução operável com segurança, recuperabilidade, experiência consistente e publicação controlada.

```text
plataforma homologada
→ riscos produtivos classificados
→ concorrência e recuperação comprovadas
→ proteção de arquivos e integrações
→ observabilidade externa
→ revisão jurídica/LGPD
→ publicação controlada
```

## Escopo incluído

### Governança

- manifesto de estado;
- checklist de go-live;
- matriz de bloqueios e evidências;
- plano de rollback;
- critérios `GO`, `NO_GO` e `CONDITIONAL_GO`;
- merge e publicação somente após aprovação explícita.

### Segurança

- revisão de RLS, privilégios e funções `SECURITY DEFINER`;
- proteção contra senhas comprometidas;
- MFA adicional para ações críticas;
- segregação de funções;
- rate limiting quando aplicável;
- headers, cookies, sessões e bundle;
- pentest e remediações;
- antimalware e quarentena de anexos.

### Concorrência e carga

- duas conexões disputando a mesma posição de estoque;
- advisory lock e saldo não negativo;
- carga e volumetria;
- retry, timeout e falha parcial;
- limites operacionais documentados.

### Backup e restauração

- backup do PostgreSQL;
- inventário de buckets privados;
- restauração isolada;
- migrations e ledger após restauração;
- smoke tests;
- RPO e RTO;
- contingência para Auth, DNS e providers.

### Assinatura jurídica

- provider real;
- webhook autenticado e idempotente;
- evidências e hashes;
- retry e reconciliação;
- cópia ao cliente;
- revisão jurídica;
- fallback operacional.

### Retenção e telemetria

- APM sem dados sensíveis;
- correlação por `correlation_id`;
- alertas de disponibilidade e erro;
- worker de retenção com dry-run;
- preservação legal;
- exportação antes de purge;
- auditoria técnica.

### Experiência e acessibilidade

- UI/UX Pro Max permanente;
- design system `Arquitetura em operação`;
- WCAG 2.2 AA;
- teclado, foco, zoom e reflow;
- estados completos;
- desktop, tablet e mobile;
- redução de movimento;
- forced colors;
- ausência do preset SaaS rosa/fúcsia.

### Jurídico, contábil e LGPD

- bases legais e finalidades;
- consentimentos;
- retenção e descarte;
- atendimento a titulares;
- contratos e termos;
- fornecedores;
- dados sensíveis;
- integrações fiscais e contábeis aplicáveis.

## Fora do escopo

- WMS avançado;
- RFID;
- roteirização logística;
- ressuprimento automático sem aprovação;
- integração fiscal completa de entrada;
- depreciação contábil oficial;
- funcionalidades sem relação direta com prontidão.

Esses itens pertencem à Etapa 21 ou a etapas posteriores.

## Fluxos

### Prontidão

```text
requisito → risco → implementação/procedimento → teste → evidência → revisão → decisão
```

### Anexo protegido

```text
sessão autorizada → contexto → tipo/tamanho → hash → quarentena
→ antimalware → liberação/bloqueio → Storage privado → download autenticado → auditoria
```

### Incidente

```text
detecção → classificação → contenção → comunicação → recuperação
→ validação → causa raiz → vacina → post-mortem
```

### Backup e restauração

```text
snapshot → integridade → armazenamento protegido → restauração isolada
→ migrations/ledger → smoke tests → RPO/RTO → evidência
```

### Concorrência de estoque

```text
saldo 10 → saída A -6 + saída B -6 em paralelo
→ advisory lock → uma postagem + uma rejeição
→ saldo 4 → reversões → saldo 0
```

## Modelo de dados

A fundação e o E2E de concorrência não criam schema novo.

Mudanças futuras exigem migration append-only documentando:

- objetos;
- RLS;
- privilégios;
- índices;
- lock e backfill;
- estratégia corretiva;
- retenção;
- testes.

A fixture `E2E20-CONCURRENCY` é permanente apenas na homologação e deve permanecer com saldo zero fora da execução.

## Rotas

A fundação não adiciona rota pública.

Superfícies prioritárias:

```text
/app
/app/auditoria
/app/estoque
/app/assinaturas
/app/documentos
/app/qualidade
/app/ocorrencias
/cliente
```

## RPCs e integrações

RPCs exercitadas na concorrência:

```text
install_inventory_defaults
create_inventory_movement
post_inventory_movement
reverse_inventory_movement
```

Integrações ainda planejadas:

- provider jurídico;
- antimalware;
- telemetria/APM;
- backup;
- worker de retenção;
- canal de incidentes.

Toda integração deve possuir timeout, retry controlado, idempotência, sanitização, health check, auditoria e procedimento de indisponibilidade.

## Segurança e RLS

- nenhuma policy flexibilizada;
- nenhuma RPC operacional para `anon`;
- Service Role somente no servidor e no setup técnico autorizado;
- `SECURITY DEFINER` com `search_path` e autorização interna;
- logs e artefatos sem secrets;
- arquivos privados sem URL pública permanente;
- ações críticas podem exigir MFA, motivo e alçada;
- fixtures não escrevem colunas sensíveis diretamente;
- testes negativos obrigatórios.

## Storage

Buckets permanecem privados.

A Etapa 20 deve inventariar:

- tipos e limites;
- contexto e hash;
- quarentena e antimalware;
- retenção;
- download autenticado;
- remoção de órfãos;
- backup ou estratégia de recuperação.

## UI/UX Pro Max

Direção canônica: **Arquitetura em operação**.

### Fundação implantada

```text
diretrizes/UI-UX-PRO-MAX.md
app/globals.css
app/stage20.css
app/app/layout.tsx
app/app/page.tsx
scripts/validate-stage20.mjs
```

Entregas:

- azul profundo, cobre e materiais naturais;
- link de salto;
- foco visível;
- alvos mínimos de 44px;
- contexto organizacional;
- dashboard com dados reais da sessão;
- classes antes ausentes implementadas;
- estados e badges semânticos;
- breakpoints e forced colors;
- redução de movimento;
- prevenção automática contra rosa/fúcsia e estilos inline nos componentes-base.

## Migrations

Nenhuma migration criada até esta fatia da Etapa 20.

## Testes

### Estruturais

- documentação;
- 13 vacinas;
- ledger;
- validadores das Etapas 9 a 20;
- `validate:stage20`.

### Qualidade

- lint;
- typecheck;
- testes TypeScript;
- testes Python;
- build.

### UI/UX

- tokens;
- classes implementadas;
- link de salto;
- foco;
- 44px;
- breakpoints;
- redução de movimento;
- forced colors;
- ausência de preset proibido.

### Concorrência real

Documento de evidência:

```text
docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md
```

Resultado:

```text
workflow run: 29889168656
status: passed
cleanup: passed
saldo após disputa: 4
saldo após cleanup: 0
```

## Homologação

### Fundação

CI run `29888603943`, número `1190`:

- preflight: success;
- lint: success;
- typecheck: success;
- testes TypeScript: success;
- testes Python: success;
- build: success.

### Concorrência de estoque

Workflow `29889168656`:

- duas sessões autenticadas: aprovado;
- entrada de 10: aprovado;
- duas saídas de 6: executadas em paralelo;
- uma postagem: aprovada;
- uma rejeição por saldo insuficiente: aprovada;
- saldo não negativo: aprovado;
- reversões: aprovadas;
- rascunho rejeitado removido;
- saldo final zero;
- artefato `8517620520` preservado.

## Vacinas aplicadas ou criadas

- `VACINA-003` — ledger;
- `VACINA-004` — privilégios;
- `VACINA-005` — workflow protegido;
- `VACINA-006` — GitHub Actions;
- `VACINA-007` — secrets;
- `VACINA-008` — instalação;
- `VACINA-009` — pré-requisitos;
- `VACINA-010` — JSON;
- `VACINA-012` — estado canônico;
- `VACINA-013` — fixtures e fronteiras sensíveis.

## Limitações iniciais

Concluído:

- fundação UI/UX Pro Max;
- validador da Etapa 20;
- concorrência real da mesma posição de estoque.

Pendente:

- carga e volumetria prolongadas;
- backup e restauração;
- antimalware;
- provider jurídico;
- telemetria e retenção;
- MFA e senhas comprometidas;
- pentest;
- revisão jurídica/LGPD;
- publicação controlada.

## Próximos passos

1. backup e restauração;
2. proteção e antimalware de anexos;
3. provider jurídico;
4. telemetria e retenção;
5. Auth, MFA e senhas comprometidas;
6. carga e volumetria;
7. pentest e revisões externas;
8. go-live controlado.

## Definition of Done

- [x] branch criada;
- [x] PR `#23` em rascunho;
- [x] contrato técnico;
- [x] UI/UX Pro Max canônica;
- [x] shell e dashboard consolidados;
- [x] validador no CI;
- [x] CI da fundação verde;
- [x] concorrência real de estoque;
- [x] saldo não negativo sob disputa;
- [x] cleanup com saldo zero;
- [x] `VACINA-013` criada;
- [ ] backup e restauração;
- [ ] antimalware;
- [ ] provider jurídico;
- [ ] telemetria e retenção;
- [ ] MFA e credenciais;
- [ ] carga prolongada;
- [ ] pentest e revisões externas;
- [ ] decisão de publicação;
- [ ] CI final de toda a Etapa 20;
- [ ] merge somente após aprovação explícita.
