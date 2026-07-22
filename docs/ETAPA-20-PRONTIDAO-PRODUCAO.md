# Etapa 20 — Prontidão de Produção

## Estado

**Em implementação, com fundação documental, visual e de CI homologada.**  
Branch: `feature/etapa-20-prontidao-producao`  
PR: `#23`, em rascunho  
Base empilhada: `chore/encerramento-etapa-19` / PR `#22`  
Versão implementada atual: `0.19.0`  
Produção: não liberada

## Objetivo

Transformar a plataforma tecnicamente homologada em uma solução operável com segurança, recuperabilidade, evidência, experiência consistente e publicação controlada.

```text
plataforma homologada
→ riscos produtivos classificados
→ segurança e recuperação comprovadas
→ experiência consolidada
→ observabilidade externa
→ validação jurídica/LGPD
→ publicação controlada
```

## Escopo incluído

### Governança de produção

- manifesto de estado legível por máquina;
- checklist de go-live;
- matriz de bloqueios, responsáveis e evidências;
- plano de rollback;
- critérios `GO`, `NO_GO` e `CONDITIONAL_GO`;
- proibição de publicação automática.

### Segurança

- revisão de RLS, privilégios e funções `SECURITY DEFINER`;
- proteção contra senhas comprometidas;
- MFA adicional para ações críticas;
- segregação de funções;
- rate limiting quando aplicável;
- pentest e remediações;
- revisão de headers, cookies, sessões e bundle;
- antimalware e quarentena de anexos.

### Concorrência e carga

- múltiplas conexões disputando a mesma posição de estoque;
- validação de advisory locks;
- testes de carga representativos;
- retry, timeout e falha parcial;
- limites documentados;
- dados artificiais revertidos.

### Backup e recuperação

- backup do PostgreSQL;
- inventário de buckets privados;
- restauração isolada;
- ledger e migrations após restauração;
- medição de RPO e RTO;
- contingência para Auth, DNS e providers.

### Assinatura jurídica

- provider real;
- webhook autenticado e idempotente;
- evidências e hashes;
- retry e reconciliação;
- cópia ao cliente;
- revisão jurídica e fallback operacional.

### Retenção e telemetria

- APM sem dados sensíveis;
- correlação por `correlation_id`;
- alertas de disponibilidade e erro;
- worker de retenção com dry-run;
- preservação legal;
- exportação antes de purge;
- auditoria técnica.

### Experiência e acessibilidade

- adoção permanente de `diretrizes/UI-UX-PRO-MAX.md`;
- tokens e componentes-base;
- classes do dashboard implementadas;
- navegação interna revisada;
- estados de loading, vazio, erro, indisponibilidade e acesso negado;
- WCAG 2.2 AA;
- teclado, foco, zoom e reflow;
- desktop, tablet e mobile;
- motion discreto e redução de movimento;
- forced colors e fallback sem backdrop-filter.

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
- expansão funcional sem relação com prontidão;
- publicação sem evidência e aprovação explícita.

Esses itens pertencem à Etapa 21 ou a etapas posteriores.

## Fluxos

### Prontidão

```text
requisito → risco → implementação/procedimento → teste → evidência → revisão → decisão
```

### Anexo protegido

```text
sessão autorizada → módulo/contexto → tipo/tamanho → hash → quarentena
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

## Modelo de dados

A fundação não cria schema novo. Mudança posterior exige migration append-only com objetos, RLS, privilégios, índices, lock, backfill, estratégia corretiva, retenção e testes documentados.

## Rotas

A fundação não adiciona rota pública. Superfícies prioritárias:

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

Planejadas:

- provider jurídico;
- antimalware;
- telemetria/APM;
- backup;
- worker de retenção;
- canal de incidentes.

Toda integração deve possuir timeout, retry controlado, idempotência, sanitização, health check, auditoria e procedimento de indisponibilidade.

## Segurança e RLS

- nenhuma policy flexibilizada para produção;
- nenhuma RPC operacional para `anon`;
- Service Role somente no servidor;
- `SECURITY DEFINER` com `search_path` e autorização interna;
- logs sem dados sensíveis;
- arquivos privados sem URL pública permanente;
- ações críticas podem exigir MFA, motivo e alçada;
- testes negativos obrigatórios.

## Storage

Buckets permanecem privados. A etapa deve inventariar tipos, limites, contexto, hash, quarentena, antimalware, retenção, download autenticado, remoção de órfãos e recuperação.

## UI/UX Pro Max

Direção canônica: **Arquitetura em operação**.

- azul profundo, cobre e materiais naturais;
- densidade controlada;
- hierarquia estrutural;
- cards somente para agrupamentos reais;
- status semânticos com texto;
- navegação clara e autorizada;
- foco visível e alvos de 44px;
- sem preset SaaS rosa/fúcsia;
- sem métricas inventadas;
- sem depender de hover ou cor;
- estados completos e responsividade real.

### Fundação implantada

```text
diretrizes/UI-UX-PRO-MAX.md
app/globals.css
app/stage20.css
app/app/layout.tsx
app/app/page.tsx
scripts/validate-stage20.mjs
```

O shell possui link de salto, contexto organizacional e navegação semântica. A central de aplicativos usa somente módulos retornados por `getEffectiveApplications` e dados reais da sessão.

## Migrations

Nenhuma migration criada na fundação inicial.

## Testes

### Estruturais

- `pnpm validate:docs`;
- `pnpm validate:vaccines`;
- `pnpm validate:migrations`;
- validadores das Etapas 9 a 20.

### Qualidade

- lint;
- typecheck;
- testes TypeScript;
- testes Python;
- build de produção.

### UI/UX

- tokens canônicos;
- classes usadas possuem CSS;
- link de salto;
- foco visível;
- alvo mínimo de 44px;
- redução de movimento;
- breakpoints;
- forced colors;
- ausência de rosa/fúcsia;
- ausência de estilo inline nos componentes-base.

### Produção pendente

- E2E transversal;
- concorrência de estoque;
- carga;
- backup/restauração;
- provider jurídico;
- antimalware;
- retenção;
- incidentes;
- pentest.

## Homologação

A fundação foi aprovada no CI run `29888338212`, número `1180`:

- preflight: `success`;
- documentação: `success`;
- 12 vacinas: `success`;
- ledger: `success`;
- validadores das Etapas 17 a 20: `success`;
- lint: `success`;
- typecheck: `success`;
- testes TypeScript: `success`;
- testes Python: `success`;
- build: `success`.

O hardening posterior adicionou fallback sem `backdrop-filter`, correção da marca no breakpoint compacto e suporte a forced colors; o CI do commit documental final deve reconfirmar o conjunto.

## Vacinas aplicadas ou criadas

- `VACINA-003` — ledger;
- `VACINA-004` — privilégios;
- `VACINA-005` — workflow protegido;
- `VACINA-006` — GitHub Actions;
- `VACINA-007` — secrets;
- `VACINA-008` — instalação;
- `VACINA-009` — pré-requisitos E2E;
- `VACINA-010` — JSON;
- `VACINA-012` — estado pós-merge e etapa ativa.

## Limitações iniciais

- produção não liberada;
- provider jurídico não selecionado;
- antimalware não integrado;
- backup/restauração não comprovados;
- pentest externo não realizado;
- telemetria não conectada;
- retenção automática não executada;
- revisão jurídica/LGPD pendente;
- concorrência real de estoque pendente.

## Próximos passos

1. concorrência real do estoque;
2. backup e restauração;
3. proteção de anexos;
4. provider jurídico;
5. telemetria e retenção;
6. Auth, MFA e senhas comprometidas;
7. pentest e revisões externas;
8. go-live controlado.

## Definition of Done

- [x] branch criada;
- [x] PR `#23` em rascunho;
- [x] contrato técnico criado;
- [x] UI/UX Pro Max canônica;
- [x] validador da Etapa 20 no CI;
- [x] shell e dashboard consolidados;
- [x] CI da fundação verde;
- [x] documentação canônica atualizada no mesmo PR;
- [ ] concorrência real de estoque;
- [ ] backup e restauração;
- [ ] antimalware;
- [ ] provider jurídico;
- [ ] telemetria e retenção;
- [ ] MFA e credenciais;
- [ ] pentest e revisões externas;
- [ ] decisão de publicação;
- [ ] CI final de toda a Etapa 20;
- [ ] merge somente após aprovação explícita.
